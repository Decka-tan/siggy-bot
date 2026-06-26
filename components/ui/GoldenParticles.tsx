"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
  rotation?: number;
  rotationSpeed?: number;
  shape?: "circle" | "spark" | "star";
};

interface GoldenParticlesProps {
  mode?: "ambient" | "celebration";
  trigger?: boolean;
  count?: number;
}

export function GoldenParticles({
  mode = "ambient",
  trigger = true,
  count,
}: GoldenParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Palet warna emas/kuning premium
  const goldenColors = [
    "rgba(255, 215, 0, ",  // Gold
    "rgba(245, 197, 24, ",  // Accent Yellow
    "rgba(255, 239, 155, ", // Light Gold
    "rgba(212, 175, 55, ",  // Dark Gold
    "rgba(255, 223, 0, ",   // Golden Yellow
  ];

  const getRandomColor = (alpha = 1) => {
    const base = goldenColors[Math.floor(Math.random() * goldenColors.length)];
    return base + alpha + ")";
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Viewport-based sizing for absolute reliability
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const spawnAmbientParticle = (yPos?: number): Particle => {
      const size = Math.random() * 2 + 1;
      return {
        x: Math.random() * canvas.width,
        y: yPos !== undefined ? yPos : Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(Math.random() * 0.5 + 0.2), // slow upward float
        size,
        color: getRandomColor(Math.random() * 0.4 + 0.1),
        alpha: Math.random() * 0.6 + 0.1,
        decay: 0.001 + Math.random() * 0.002,
        shape: Math.random() > 0.85 ? "spark" : "circle",
      };
    };

    const spawnCelebrationParticles = () => {
      const numParticles = count || 120;
      const particles: Particle[] = [];
      const originX = canvas.width / 2;
      const originY = canvas.height * 0.6; // spawn from lower-middle area

      for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 4;
        const size = Math.random() * 4 + 2;
        const shapeRand = Math.random();
        const shape = shapeRand > 0.7 ? "star" : shapeRand > 0.4 ? "spark" : "circle";
        
        particles.push({
          x: originX + (Math.random() - 0.5) * 40,
          y: originY + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3, // Initial burst upwards
          size,
          color: getRandomColor(1),
          alpha: 1,
          decay: 0.01 + Math.random() * 0.015,
          gravity: 0.15,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          shape,
        });
      }
      particlesRef.current = [...particlesRef.current, ...particles];
    };

    // Pre-populate ambient particles throughout the page height
    if (mode === "ambient") {
      const initialCount = Math.floor((canvas.width * canvas.height) / 15000);
      const list: Particle[] = [];
      for (let i = 0; i < initialCount; i++) {
        list.push(spawnAmbientParticle());
      }
      particlesRef.current = list;
    } else if (mode === "celebration" && trigger) {
      spawnCelebrationParticles();
    }

    const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      c.beginPath();
      c.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        c.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        c.lineTo(x, y);
        rot += step;
      }
      c.lineTo(cx, cy - outerRadius);
      c.closePath();
      c.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;

      if (mode === "ambient") {
        // Spawn standard background particles if needed
        const targetCount = Math.floor((canvas.width * canvas.height) / 12000);
        if (particles.length < targetCount && Math.random() < 0.2) {
          particles.push(spawnAmbientParticle(canvas.height + 10)); // spawn at bottom
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Apply physics
        if (p.gravity) {
          p.vy += p.gravity;
        }
        p.x += p.vx;
        p.y += p.vy;

        if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
          p.rotation += p.rotationSpeed;
        }

        // Apply decay
        p.alpha -= p.decay;

        // Remove dead particles
        if (p.alpha <= 0 || p.x < -20 || p.x > canvas.width + 20 || p.y > canvas.height + 20) {
          particles.splice(i, 1);
          continue;
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === "star") {
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined) ctx.rotate(p.rotation);
          drawStar(ctx, 0, 0, 5, p.size * 2, p.size);
        } else if (p.shape === "spark") {
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined) ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 2, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Circle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, trigger, count]);

  // Use fixed positioning so it overlays nicely and handles scroll
  const classes =
    mode === "celebration"
      ? "fixed inset-0 pointer-events-none z-50"
      : "fixed inset-0 pointer-events-none z-0 opacity-40";

  return <canvas ref={canvasRef} className={classes} />;
}
