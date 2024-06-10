import { getKeypairFromEnvironment } from "@solana-developers/helpers";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
} from "@metaplex-foundation/js";
import "dotenv/config";
import fs from "fs";

interface NftData {
  name: string;
  symbol: string;
  description: string;
  sellerFeeBasisPoints: number;
  imageFile: string;
}

const nft: NftData = {
  name: "Sudhami",
  symbol: "🐕",
  description: "This is an NFT",
  imageFile: "dog1.avif",
  sellerFeeBasisPoints: 0,
};

const updateNft: NftData = {
  name: "Sudhami 2.0",
  symbol: "🐯",
  description: "You might think i'm a dog but i'm a tiger Errrrrrrrrr.",
  imageFile: "dog2.avif",
  sellerFeeBasisPoints: 100,
};

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const user = getKeypairFromEnvironment("SECRET_KEY");

(async () => {
  const balance = await connection.getBalance(user.publicKey);
  console.log(
    `${user.publicKey.toBase58()} has balance ${balance / LAMPORTS_PER_SOL} SOL`
  );

  // Setup Metaplex instance
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    );

  async function uploadMetadata(
    metaplex: Metaplex,
    nftData: NftData
  ): Promise<string> {
    const buffer = fs.readFileSync("./" + nftData.imageFile);
    const file = toMetaplexFile(buffer, nftData.imageFile);

    const imageUri = await metaplex.storage().upload(file);
    console.log("Image Uri:", imageUri);

    const { uri } = await metaplex.nfts().uploadMetadata({
      name: nftData.name,
      symbol: nftData.symbol,
      description: nftData.description,
      image: imageUri,
    });

    console.log("Metadata URI:", uri);
    return uri;
  }

  async function createNft(metaplex: Metaplex, nftData: NftData, uri: string) {
    const { nft } = await metaplex.nfts().create(
      {
        uri: uri, // metadata URI
        name: nftData.name,
        sellerFeeBasisPoints: nftData.sellerFeeBasisPoints,
        symbol: nftData.symbol,
      },
      { commitment: "finalized" }
    );

    console.log(
      `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
    );

    return nft;
  }

  async function updateNftUri(
    metaplex: Metaplex,
    uri: String,
    mintAddress: PublicKey
  ) {
    const nft = await metaplex.nfts().findByMint({
      mintAddress,
    });

    const { response } = metaplex.nfts().update(
      {
        nftOrSft: nft,
        uri: uri,
      },
      {
        commitment: "finalized",
      }
    );
    console.log(response);
    console.log("updated successfull go and check with token mint address");
  }

  const uri = await uploadMetadata(metaplex, updateNft);
  // const nftAddress = await createNft(metaplex, nft, uri);
  const nftAddress = await updateNftUri(
    metaplex,
    uri,
    new PublicKey("6iip4ek3AFjT35q2fDAFJ4Jkq6KjKy8DUtYM6e3jLzsB")
  );
})();
