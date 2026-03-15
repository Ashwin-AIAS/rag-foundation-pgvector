import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CyberCursor() {
  const dotX  = useMotionValue(-100);
  const dotY  = useMotionValue(-100);
  const isHovering = useRef(false);

  // We need to keep spring sources separate for the ring
  const rawRingX = useMotionValue(-100);
  const rawRingY = useMotionValue(-100);
  const springRingX = useSpring(rawRingX, { damping: 20, stiffness: 300, mass: 0.5 });
  const springRingY = useSpring(rawRingY, { damping: 20, stiffness: 300, mass: 0.5 });
  const ringScale = useSpring(1, { stiffness: 400, damping: 25 });

  useEffect(() => {
    const move = (e) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      rawRingX.set(e.clientX);
      rawRingY.set(e.clientY);
    };

    const checkHover = (e) => {
      const el = e.target;
      const isInteractive =
        el.closest('button') ||
        el.closest('a') ||
        el.closest('[data-cursor-hover]') ||
        el.closest('select') ||
        el.closest('input') ||
        el.closest('[role="button"]');
      if (isInteractive && !isHovering.current) {
        isHovering.current = true;
        ringScale.set(2.2);
      } else if (!isInteractive && isHovering.current) {
        isHovering.current = false;
        ringScale.set(1);
      }
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', checkHover);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', checkHover);
    };
  }, []);

  return (
    <>
      {/* Dot — no lag */}
      <motion.div
        style={{
          x: dotX,
          y: dotY,
          position: 'fixed',
          top: -4,
          left: -4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#00d4ff',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 0 8px #00d4ff',
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
      {/* Ring — spring lag */}
      <motion.div
        style={{
          x: springRingX,
          y: springRingY,
          scale: ringScale,
          position: 'fixed',
          top: -16,
          left: -16,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '1.5px solid rgba(0,212,255,0.5)',
          pointerEvents: 'none',
          zIndex: 99998,
          translateX: '-50%',
          translateY: '-50%',
          background: isHovering.current ? 'rgba(0,212,255,0.1)' : 'transparent',
        }}
      />
    </>
  );
}
