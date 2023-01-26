import styles from "../styles/Home.module.css";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { GSNConfig, RelayProvider } from "@opengsn/provider";
import { TalentLayerIdAbi } from "../abis/talent-layer-id";

// Address of Open GSN Paymaster, deployed on Mumbai Testnet: https://docs-v2.opengsn.org/networks/polygon/mumbai.html#mumbai-testnet
const paymasterAddress = "0xcA94aBEdcC18A10521aB7273B3F3D5ED28Cf7B8A";

const talentLayerIdAddress = "0x20c1Dec4ca935c5848B0F8Ea963713d8F3594c02";
const platformId = 1;

interface Profile {
  id: number;
  handle: string;
}

const Home = () => {
  const { address } = useAccount();

  const [profile, setProfile] = useState<Profile | null>();
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [talentLayerID, setTalentLayerID] = useState<ethers.Contract | null>(
    null
  );

  /**
   * Setup TalentLayerID contract using Open GSN provider
   */
  useEffect(() => {
    const getContract = async () => {
      if (!window.ethereum) return;

      const gsnConfig: Partial<GSNConfig> = {
        loggerConfiguration: { logLevel: "debug" },
        paymasterAddress,
        relayLookupWindowBlocks: 1000,
        relayRegistrationLookupBlocks: 1000,
      };

      const gsnProvider = RelayProvider.newProvider({
        provider: window.ethereum as any,
        config: gsnConfig,
      });
      await gsnProvider.init();

      const provider = new ethers.providers.Web3Provider(gsnProvider as any);

      const talentLayerID = new ethers.Contract(
        talentLayerIdAddress,
        TalentLayerIdAbi,
        provider.getSigner()
      );

      setTalentLayerID(talentLayerID);
    };

    getContract();
  }, []);

  /**
   * Get TalentLayer profile data for the connected wallet
   */
  const getProfile = useCallback(async () => {
    if (!talentLayerID || !address) return;

    const tlId = await talentLayerID.walletOfOwner(address);
    if (tlId.toNumber() === 0) {
      setProfile(null);
      return;
    }

    const profile = await talentLayerID.profiles(tlId);

    setProfile({
      id: tlId.toNumber(),
      handle: profile.handle,
    });
  }, [talentLayerID, address]);

  useEffect(() => {
    getProfile();
  }, [getProfile]);

  const onMint = async () => {
    if (!talentLayerID) return;
    setLoading(true);

    try {
      const tx = await talentLayerID.mint(platformId, handle);
      await tx.wait();

      setHandle("");
      getProfile();
    } catch (error: any) {
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>TalentLayer Open GSN Gasless Example</h1>

        <ConnectButton />

        {profile ? (
          <div className={styles.details}>
            <p className={styles.message}>
              You already have a TalentLayer ID! Use another address to mint a
              new TalentLayer ID without paying for gas fees!
            </p>
            <p>
              <b>Your TalentLayer Id: </b>
              {profile.id}
            </p>
            <p>
              <b>Your TalentLayer Handle: </b>
              {profile.handle}
            </p>
          </div>
        ) : (
          <div>
            <p className={styles.message}>
              Mint your TalentLayer ID without paying gas fees! You will be
              asked to sign a meta-transaction and an Open GSN relayer will
              submit the transaction to the blockchain for you, paying for the
              gas fees. Learn more{" "}
              <a
                href="https://docs.opengsn.org/"
                className={styles.link}
                target="_blank"
                rel="noreferrer"
              >
                here
              </a>
            </p>

            <div>
              <input
                type="text"
                placeholder="Choose your handle"
                className={styles.input}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
              <button
                disabled={loading || !handle}
                className={styles.button}
                onClick={onMint}
              >
                {/* Spinner */}
                Mint
                {loading && (
                  <svg
                    width="1rem"
                    height="1rem"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className={styles.spinner}
                  >
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </main>
    </div>
  );
};

export default Home;
