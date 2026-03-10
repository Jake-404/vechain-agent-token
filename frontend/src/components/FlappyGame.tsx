import { useWallet, useThor } from "@vechain/dapp-kit-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { GAME_REWARDS_ADDRESS, GAME_SIGNER_KEY } from "../config/vechain";
import { ethers, Interface } from "ethers";

// --- Game constants ---
const W = 400;
const H = 600;
const BIRD_R = 14;
const BIRD_X = 80;
const GRAVITY = 0.3;
const FLAP_VEL = -6;
const PIPE_W = 52;
const PIPE_GAP = 200;
const PIPE_SPEED = 2;
const PIPE_INTERVAL = 100; // frames between pipes

// --- ABI for contract reads ---
const REWARDS_ABI = [
  { inputs: [{ name: "player", type: "address" }], name: "nonces", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "poolBalance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "player", type: "address" }], name: "totalClaimed", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
];

interface Pipe {
  x: number;
  gapTop: number;
  passed: boolean;
}

interface GameState {
  birdY: number;
  vel: number;
  pipes: Pipe[];
  score: number;
  frame: number;
}

interface FlappyGameProps {
  account: string | null;
}

function FlappyGame({ account }: FlappyGameProps) {
  const { requestTransaction } = useWallet();
  const thor = useThor();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>({
    birdY: H / 2,
    vel: 0,
    pipes: [],
    score: 0,
    frame: 0,
  });

  const [phase, setPhase] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [claimStatus, setClaimStatus] = useState<"idle" | "signing" | "pending" | "success" | "error">("idle");
  const [claimTxId, setClaimTxId] = useState("");
  const [claimError, setClaimError] = useState("");
  const [poolBalance, setPoolBalance] = useState("...");
  const [totalEarned, setTotalEarned] = useState("0");

  // --- Fetch pool info ---
  const fetchPoolInfo = useCallback(async () => {
    if (GAME_REWARDS_ADDRESS === "0x0000000000000000000000000000000000000000") return;
    try {
      const c = thor.contracts.load(GAME_REWARDS_ADDRESS, REWARDS_ABI);
      const [pool] = await c.read.poolBalance();
      setPoolBalance((Number(BigInt(String(pool))) / 1e18).toLocaleString());
      if (account) {
        const [claimed] = await c.read.totalClaimed(account);
        setTotalEarned((Number(BigInt(String(claimed))) / 1e18).toLocaleString());
      }
    } catch {
      /* contract not deployed */
    }
  }, [thor, account]);

  useEffect(() => { fetchPoolInfo(); }, [fetchPoolInfo]);

  // --- Drawing ---
  function draw(ctx: CanvasRenderingContext2D, g: GameState) {
    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0f1a2e");
    grad.addColorStop(1, "#0a0e17");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Ground line
    ctx.fillStyle = "#1e2a45";
    ctx.fillRect(0, H - 2, W, 2);

    // Pipes
    ctx.fillStyle = "#22c55e";
    for (const p of g.pipes) {
      // Top pipe
      ctx.fillRect(p.x, 0, PIPE_W, p.gapTop);
      // Bottom pipe
      ctx.fillRect(p.x, p.gapTop + PIPE_GAP, PIPE_W, H - p.gapTop - PIPE_GAP);
      // Pipe caps
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(p.x - 3, p.gapTop - 20, PIPE_W + 6, 20);
      ctx.fillRect(p.x - 3, p.gapTop + PIPE_GAP, PIPE_W + 6, 20);
      ctx.fillStyle = "#22c55e";
    }

    // Bird
    ctx.beginPath();
    ctx.arc(BIRD_X, g.birdY, BIRD_R, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bird eye
    ctx.beginPath();
    ctx.arc(BIRD_X + 5, g.birdY - 4, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(BIRD_X + 6, g.birdY - 4, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();

    // Score
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(g.score), W / 2, 50);
  }

  // --- Animation loop: runs while phase === "playing" ---
  useEffect(() => {
    if (phase !== "playing") return;

    let raf = 0;
    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const g = gameRef.current;

      // Physics
      g.vel += GRAVITY;
      g.birdY += g.vel;
      g.frame++;

      // Spawn pipes
      if (g.frame % PIPE_INTERVAL === 0) {
        const minGap = 80;
        const maxGap = H - PIPE_GAP - 80;
        const gapTop = minGap + Math.random() * (maxGap - minGap);
        g.pipes.push({ x: W, gapTop, passed: false });
      }

      // Move pipes & score
      for (const p of g.pipes) {
        p.x -= PIPE_SPEED;
        if (!p.passed && p.x + PIPE_W < BIRD_X) {
          p.passed = true;
          g.score++;
          setScore(g.score);
        }
      }

      // Remove off-screen pipes
      g.pipes = g.pipes.filter((p) => p.x + PIPE_W > -10);

      // Collision: floor / ceiling
      if (g.birdY + BIRD_R > H || g.birdY - BIRD_R < 0) {
        setPhase("gameover");
        draw(ctx, g);
        return;
      }

      // Collision: pipes
      for (const p of g.pipes) {
        if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
          if (g.birdY - BIRD_R < p.gapTop || g.birdY + BIRD_R > p.gapTop + PIPE_GAP) {
            setPhase("gameover");
            draw(ctx, g);
            return;
          }
        }
      }

      draw(ctx, g);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // --- Start / flap ---
  const flap = useCallback(() => {
    const g = gameRef.current;
    if (phase === "idle" || phase === "gameover") {
      // Reset game state
      g.birdY = H / 2;
      g.vel = FLAP_VEL;
      g.score = 0;
      g.frame = 0;
      // Pre-spawn first pipe
      const minGap = 80;
      const maxGap = H - PIPE_GAP - 80;
      const gapTop = minGap + Math.random() * (maxGap - minGap);
      g.pipes = [{ x: W + 60, gapTop, passed: false }];
      setScore(0);
      setClaimStatus("idle");
      setClaimTxId("");
      setClaimError("");
      setPhase("playing"); // this triggers the useEffect loop
    } else if (phase === "playing") {
      g.vel = FLAP_VEL;
    }
  }, [phase]);

  // --- Input handlers ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flap]);

  // Draw idle screen
  useEffect(() => {
    if (phase !== "idle") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const g = gameRef.current;
    draw(ctx, g);

    // Draw "Click to Start" text
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 24px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Click or Space to Start", W / 2, H / 2 + 60);

    // Draw bird icon larger
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 - 20, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2 + 10, H / 2 - 28, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W / 2 + 12, H / 2 - 28, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
  }, [phase]);

  // --- Claim reward ---
  const handleClaim = async () => {
    if (score === 0 || !GAME_SIGNER_KEY || !account) return;

    try {
      setClaimStatus("signing");

      // Read nonce
      const contract = thor.contracts.load(GAME_REWARDS_ADDRESS, REWARDS_ABI);
      const [nonce] = await contract.read.nonces(account);
      const nonceNum = Number(nonce);

      // Sign score with game signer
      const signerWallet = new ethers.Wallet(GAME_SIGNER_KEY);
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "address"],
        [account, score, nonceNum, GAME_REWARDS_ADDRESS]
      );
      const signature = await signerWallet.signMessage(ethers.getBytes(messageHash));

      // Encode claimReward call
      setClaimStatus("pending");
      const iface = new Interface([
        "function claimReward(uint256 score, uint256 nonce, bytes signature)",
      ]);
      const data = iface.encodeFunctionData("claimReward", [
        score,
        nonceNum,
        signature,
      ]);

      const clause = {
        to: GAME_REWARDS_ADDRESS,
        value: "0x0",
        data: data,
      };

      const result = await requestTransaction([clause], {
        comment: `Claim ${score} VA tokens for Flappy Bird score`,
      });

      setClaimTxId(result.txid);
      setClaimStatus("success");
      fetchPoolInfo();
    } catch (err: any) {
      console.error("Claim failed:", err);
      setClaimError(err?.message || "Claim failed");
      setClaimStatus("error");
    }
  };

  const hasRewardsContract =
    GAME_REWARDS_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="card game-card">
      <h2>Flappy Agent &mdash; Earn VA Tokens</h2>

      {hasRewardsContract && (
        <div className="game-pool-info">
          <span>Pool: {poolBalance} VA</span>
          <span>You earned: {totalEarned} VA</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="game-canvas"
        onClick={flap}
        onTouchStart={(e) => {
          e.preventDefault();
          flap();
        }}
      />

      {phase === "idle" && (
        <p className="game-hint">Click the canvas or press Space to start</p>
      )}

      {phase === "gameover" && (
        <div className="game-over">
          <p className="game-score">Score: {score} pipes</p>

          {hasRewardsContract && GAME_SIGNER_KEY && score > 0 && claimStatus === "idle" && account && (
            <button className="btn btn-primary" onClick={handleClaim}>
              Claim {score} VA Tokens
            </button>
          )}

          {score > 0 && !account && (
            <p className="game-hint">Connect your wallet to claim {score} VA tokens!</p>
          )}

          {claimStatus === "signing" && (
            <p className="game-hint">Preparing claim...</p>
          )}
          {claimStatus === "pending" && (
            <p className="game-hint">Confirm in wallet...</p>
          )}
          {claimStatus === "success" && (
            <div className="status success">
              Claimed {score} VA! TX:{" "}
              <code>
                {claimTxId.slice(0, 10)}...{claimTxId.slice(-6)}
              </code>
            </div>
          )}
          {claimStatus === "error" && (
            <div className="status error">{claimError}</div>
          )}

          {!hasRewardsContract && score > 0 && (
            <p className="game-hint">
              Deploy GameRewards contract to claim {score} VA tokens!
            </p>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => setPhase("idle")}
            style={{ marginTop: "0.75rem" }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default FlappyGame;
