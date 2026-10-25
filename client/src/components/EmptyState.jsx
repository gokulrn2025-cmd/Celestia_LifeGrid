import { motion } from "motion/react";

export default function EmptyState({ icon: Icon, title, message, actionText, onAction }) {
  return (
    <motion.div
      className="empty-state-box"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {Icon && (
        <motion.div
          className="empty-state-icon"
          initial={{ scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Icon size={26} />
        </motion.div>
      )}
      <h3>{title}</h3>
      <p>{message}</p>
      {actionText && onAction && (
        <motion.button
          className="neo-button lime-accent"
          onClick={onAction}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          {actionText}
        </motion.button>
      )}
    </motion.div>
  );
}
