import styles from "../styles/Home.module.css";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { GSNConfig, RelayProvider } from "@opengsn/provider";
import { TalentLayerIdAbi } from "../abis/talent-layer-id";

// Address of Open GSN Paymaster, deployed on Mumbai Testnet: https://docs-v2.opengsn.org/networks/polygon/mumbai.html#mumbai-testnet
const paymasterAddress = "0xcA94aBEdcC18A10521aB7273B3F3D5ED28Cf7B8A";

const talentLayerIdAddress = "0x71D9Cd16232681fa3Ee6AC88ED5859C9478c60Db";

interface Profile {
  id: number;
  handle: string;
}

const Home = () => {
  const { address } = useAccount();

  const [profile, setProfile] = useState<Profile | null>();

  const [talentLayerID, setTalentLayerID] = useState<ethers.Contract | null>(
    null
  );

  useEffect(() => {
    const getContract = async () => {
      const gsnConfig: Partial<GSNConfig> = {
        loggerConfiguration: { logLevel: "debug" },
        paymasterAddress,
        relayLookupWindowBlocks: 1000,
        relayRegistrationLookupBlocks: 1000,
      };

      const gsnProvider = RelayProvider.newProvider({
        provider: window.ethereum,
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

  useEffect(() => {
    if (!talentLayerID || !address) return;

    const getProfile = async () => {
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
    };

    getProfile();
  }, [talentLayerID, address]);

  const onMint = async () => {
    if (!talentLayerID) return;

    const tx = await talentLayerID.mint(1, "qwerty", {
      value: ethers.utils.parseEther("0"),
    });
    await tx.wait();
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>TalentLayer Open GSN Gasless Example</h1>

        <ConnectButton />

        {profile ? (
          <div className={styles.details}>
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
            <p>Mint your TalentLayer ID without paying gas fees!</p>
            <button className={styles.button} onClick={onMint}>
              Mint
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
