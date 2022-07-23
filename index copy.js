import { React, useState, useEffect } from "react";
import Web3 from "web3";
import { ADDRESS, ABI } from "../config.js";
import IndexNavbar from "../components/indexnavbar";
import Head from "next/head";
import Link from "next/link";
import { fakeWhitelist } from "../components/fakewhitelist.js";
import { Container, Row, Col, Card, CardBody, Button } from "reactstrap";
import { ToastContainer, toast } from 'react-toastify';
import { Slide, Zoom, Flip, Bounce } from 'react-toastify';



async function saveWallet(wallet, quantity, exists, id) {
  const response = await fetch("api/wallets", {
    method: "POST",
    body: JSON.stringify({
      id: id,
      address: wallet,
      quantity: quantity,
      exists: exists,
    }),
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return await response.json();
}

// core components
function MintPage({ initialWallets }) {
  // FOR WALLET
  const [signedIn, setSignedIn] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [inWhitelist, setInWhiteList] = useState(false);

  // FOR MINTING
  const [boneContract, setBoneContract] = useState(null);

  // INFO FROM SMART Contract
  const [tokensMinted, setTokensMinted] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);
  const [freeSaleStarted, setSaleStarted] = useState(false);

  const [nothingForSale, setNothingForSale] = useState(false);
  const [presale, setPresale] = useState(false);
  const [bonePrice, setBonePrice] = useState(0);
  const [show, setShow] = useState(false);
  const [fakePresale, setFakePresale] = useState(false);
  const [inFakeWhitelist, setinFakeWhitelist] = useState(false);
  const [mintCount, setMintCount] = useState(0);
  const [freetokencountwallet, setfreetokencountwallet] = useState(0);
  const [exists, setExists] = useState(false);
  const [id, setId] = useState();

  const customId = "custom-id-yes";

  const notifyloginsuccess = async (wallet) => toast.success("Wallet Connected: " + wallet, {
    position: "top-center",
    theme: "dark",
    autoClose: 3000,
    hideProgressBar: false,
    transition: Zoom,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    pauseOnFocusLoss: false,

  });

  async function signIn() {
    if (typeof window.web3 !== "undefined") {
      window.web3 = new Web3(window.ethereum);
    } else {
      alert("No Ethereum interface injected into browser. Read-only access");
    }

    window.ethereum
      .enable()
      .then(function (accounts) {
        window.web3.eth.net
          .getNetworkType()
          // checks if connected network is mainnet (change this to rinkeby if you wanna test on testnet)
          .then((network) => {
            console.log(network);
            if (network !== "rinkeby") {
              alert(
                "You are on " +
                network +
                " network. Change network to mainnet or you won't be able to do anything here"
              );
            }
          });
        let wallet = accounts[0];
        setWalletAddress(wallet);
        setSignedIn(true);
        notifyloginsuccess(wallet);
        callContractData(wallet);
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  async function signOut() {
    setSignedIn(false);
  }

  async function callContractData(wallet) {
    // let balance = await web3.eth.getBalance(wallet);
    // setWalletBalance(balance)
    const boneContract = new window.web3.eth.Contract(ABI, ADDRESS);
    setBoneContract(boneContract);

    const salebool = await boneContract.methods.isFreesaleActive().call();
    setSaleStarted(salebool);

    const presalebool = await boneContract.methods.isPresaleActive().call();
    setPresale(presalebool);

    const whitelistBool = await boneContract.methods
      .addressInWhitelistfree(wallet)
      .call();
    setInWhiteList(whitelistBool);

    setNothingForSale(!presalebool && !salebool);

    const totalSupply = await boneContract.methods.MAX_TOKENS().call();
    setTotalSupply(totalSupply);

    const bonePrice = await boneContract.methods.freePrice().call();
    setBonePrice(bonePrice);

    const tokensMinted = await boneContract.methods.totalSupply().call();
    setTokensMinted(tokensMinted);

    const freetokencountwallet = await boneContract.methods.balanceOf(wallet).call();
    setfreetokencountwallet(freetokencountwallet)

    console.log(initialWallets)

    fakeWhitelist.forEach((element) => {
      if (element.toUpperCase() == wallet.toUpperCase()) {
        setinFakeWhitelist(true);
        initialWallets.forEach((item) => {
          if (item.address.toUpperCase() == wallet.toUpperCase()) {
            setMintCount(item.mintcount);
            setId(item.id)
            setExists(true);
            console.log(item.mintcount);
          }
        });
      }
    });
  }

  async function mintBone(how_many_bones) {
    if (boneContract) {
      const price = Number(bonePrice) * how_many_bones;

      console.log({ from: walletAddress, value: price });
      if (freeSaleStarted) {
        const gasAmount = await boneContract.methods
          .freeMintBone(how_many_bones)
          .estimateGas({ from: walletAddress, value: price })
          .catch(function (error) {
            alert(error);
          });
        console.log("estimated gas", gasAmount);
        boneContract.methods
          .freeMintBone(how_many_bones)
          .send({ from: walletAddress, value: price, gas: String(gasAmount) })
          .on("transactionHash", function (hash) {
            console.log("transactionHash", hash);
            saveWallet(walletAddress, mintCount + how_many_bones, exists, id);
          })
          .catch(function (error) {
            alert(error);
          });
      } else {
        const gasAmount = await boneContract.methods
          .mintBone(how_many_bones)
          .estimateGas({ from: walletAddress, value: price })
          .catch(function (error) {
            alert(error);
          });
        console.log(mintCount);
        boneContract.methods
          .mintBone(how_many_bones)
          .send({ from: walletAddress, value: price, gas: String(gasAmount) })
          .on("transactionHash", async function (hash) {
            console.log("transactionHash", hash);
            saveWallet(walletAddress, mintCount + how_many_bones, exists, id);
            console.log(mintCount);
          })
          .catch(function (error) {
            alert(error);
          });
      }
      setShow(!show);
    } else {
      console.log("Wallet not connected");
    }
  }

  return (
    <>
      <Head>
        <title>Pocket Bones | Mint</title>
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="Mint A Bone" key="ogtitle" />
        <meta
          property="og:description"
          content="Mint your Pocket Bone here"
          key="ogdesc"
        />
        <meta property="og:type" content="website" key="ogtype" />
        <meta
          property="og:url"
          content="https://bones.co/mint-page"
          key="ogurl"
        />
        <meta
          property="og:image"
          content="https://bones.co/.gif"
          key="ogimage"
        />
        <meta
          property="og:site_name"
          content="https://bones.co/mint-page"
          key="ogsitename"
        />
        <meta name="twitter:card" content="summary_large_image" key="twcard" />
        <meta property="twitter:domain" content="bones.co" key="twdomain" />
        <meta
          property="twitter:url"
          content="https://bones.co/mint-page"
          key="twurl"
        />
        <meta name="twitter:title" content="Mint A Bone" key="twtitle" />
        <meta
          name="twitter:description"
          content="Mint your Pocket Bone here"
          key="twdesc"
        />
        <meta
          name="twitter:image"
          content="https://bones.co/Logo.png"
          key="twimage"
        />
      </Head>
      <div className="page-header section-dark body">
        <div className="" />
        <IndexNavbar />
        <Container className="text-center mt-auto mb-auto">

          <>
            <Row>
              <Col className="ml-auto mr-auto mt-5 pt-5" md="12">
                <h1 className="header">Mint your Pocket Bones</h1>
              </Col>
            </Row>
            <Row>
              <Col className="ml-auto mr-auto mb-4" md="12">
                <p className="text">0.07 ETH per Pocket Bones</p>
              </Col>
            </Row>
            <Row>
              <Col className="ml-auto mr-auto mb-5" md="5">
                <div className="outline mb-3">
                  <h6 className="white text bold">Total Minted:</h6>
                  <h4 className="text  mx-0 px-0 my-0 py-0 bold">
                    <>{tokensMinted}</> / <>10,000</>
                  </h4>
                </div>

                {!signedIn ? (
                  <Button onClick={signIn} className="btn metamask-btn">
                    Connect Wallet
                  </Button>
                ) : (
                  <Button onClick={signOut} className="btn mx-2 metamask-btn">
                    Sign out
                  </Button>
                )}
              </Col>
            </Row>
          </>


          <>
            <Row>
              <Col className="ml-auto " md="6">
                <Card>
                  <CardBody>
                    <div className="flex auth my-8 font-bold  justify-center items-center vw2">
                      <h1 className="text white bold">1 PACK</h1>
                      <p className="text">FREE</p>
                      {signedIn ? (
                        freeSaleStarted ? (
                          inWhitelist ? (
                            freetokencountwallet > 0 ? (

                              <Button className="btn button mx-2 mb-1 " disabled>
                              You have already minted.
                            </Button>

                            ) : (

                              <Button
                              onClick={() => mintBone(1)}
                              className="btn mx-2 mb-1 button"
                            >
                              Mint 1 pack
                            </Button>

                            )
                          ) : (

                            <Button className="btn button mx-2 mb-1 " disabled>
                              You are not whitelisted.
                            </Button>

                          )
                        ) : (
                          <Button className="btn button mx-2 mb-1 " disabled>
                            The Sale isn&apos;t active yet
                          </Button>
                        )


                      ) : (
                        <Button className="btn button mx-2 mb-1 " disabled>
                          Connect Your Wallet
                        </Button>
                      )}

                    </div>
                  </CardBody>
                </Card>
              </Col>
              <Col className="ml-auto " md="6">
                <Card>
                  <CardBody>
                    <div className="flex auth my-8 font-bold  justify-center items-center vw2">
                      <h1 className="text white bold">1 PACK</h1>
                      <p className="text">0.07 ETH</p>
                      {signedIn ? (
                        presale ? (
                          inWhitelist ? (
                            freetokencountwallet > 0 ? (

                              <Button className="btn button mx-2 mb-1 " disabled>
                              You have already minted.
                            </Button>

                            ) : (

                              <Button
                              onClick={() => mintBone(1)}
                              className="btn mx-2 mb-1 button"
                            >
                              Mint 1 pack
                            </Button>

                            )
                          ) : (

                            <Button className="btn button mx-2 mb-1 " disabled>
                              You are not whitelisted.
                            </Button>

                          )
                        ) : (
                          <Button onClick={notifyloginsuccess} className="btn button mx-2 mb-1 " disabled>
                            The Presale isn&apos;t active yet
                          </Button>
                        )


                      ) : (
                        <Button className="btn button mx-2 mb-1 " disabled>
                          Connect Your Wallet
                        </Button>
                      )}

                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </>
          {show && (
            <>
              <h1 className="header">Thank you for minting!</h1>
              <p className="text">
                Your Pocket Bone will arrive as soon as the transaction is
                processed
              </p>
              <Link
                activeClass="active"
                href="https://www.pocketbones.com/"
                passHref={true}
              >
                <Button className="btn button mx-2 mb-1">
                  Back to the home page
                </Button>
              </Link>
            </>
          )}
        </Container>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          rtl={false}
          pauseOnHover
        />
      </div>
      
    </>
  );
}

export default MintPage;
