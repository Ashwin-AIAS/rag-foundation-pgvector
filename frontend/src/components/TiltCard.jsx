import { useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export default function TiltCard({ children, className = '', style = {} }) {
    const ref = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    // Using springs for smooth interpolation of the tilt
    const rotateX = useSpring(0, { stiffness: 300, damping: 20 });
    const rotateY = useSpring(0, { stiffness: 300, damping: 20 });

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        
        // Exact mouse position relative to card inside
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Center values
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Constrain max rotation to 4 degrees
        const rotX = ((y - centerY) / centerY) * -4;
        const rotY = ((x - centerX) / centerX) * 4;
        
        rotateX.set(rotX);
        rotateY.set(rotY);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        rotateX.set(0);
        rotateY.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={className}
            style={{
                ...style,
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
                perspective: 1000,
                // Soft hover perspective shadow
                boxShadow: isHovered 
                    ? '0 20px 40px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.15)' 
                    : style.boxShadow || 'none'
            }}
            transition={{ duration: 0.1 }}
        >
            <div style={{ transform: 'translateZ(20px)', width: '100%', height: '100%' }}>
                {children}
            </div>
        </motion.div>
    );
}
