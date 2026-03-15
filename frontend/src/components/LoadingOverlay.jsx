import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingOverlay({ isLoading }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-10 h-10">
              <motion.div 
                className="absolute inset-0 rounded-full"
                style={{ border: '2px solid rgba(255,255,255,0.1)' }}
              />
              <motion.div 
                className="absolute inset-0 rounded-full"
                style={{ border: '2px solid #f5f5f7', borderTopColor: 'transparent' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <motion.span 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="apple-caption text-[13px]"
            >
              Processing request...
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
