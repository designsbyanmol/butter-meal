import React, { useState, useEffect, useRef } from "react";
import styles from "./Promotion.module.scss";

interface PromotionProps {
  promoLink?: string;
  promoTitle?: string;
  messages?: string[];
  typingSpeed?: number;
  eraseSpeed?: number;
  delayBeforeErase?: number;
  delayBeforeType?: number;
}

const Promotion: React.FC<PromotionProps> = ({ 
  promoLink, 
  promoTitle = "Promotion", 
  messages = ["🎉 Special Offer Coming Soon!", "✨ Don't Miss Out!", "🔥 Limited Time Only!"],
  typingSpeed = 100,
  eraseSpeed = 50,
  delayBeforeErase = 1000,
  delayBeforeType = 1000
}) => {
  const [displayText, setDisplayText] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const currentMessage = messages[messageIndex % messages.length];

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (promoLink) {
      setDisplayText("");
      setMessageIndex(0);
      setIsDeleting(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!isDeleting) {
      if (displayText.length < currentMessage.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayText(currentMessage.slice(0, displayText.length + 1));
        }, typingSpeed);
      } else {
        timeoutRef.current = setTimeout(() => {
          setIsDeleting(true);
        }, delayBeforeErase);
      }
    } else {
      if (displayText.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, eraseSpeed);
      } else {
        timeoutRef.current = setTimeout(() => {
          setMessageIndex(prev => prev + 1);
          setIsDeleting(false);
        }, delayBeforeType);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [displayText, isDeleting, currentMessage, promoLink, typingSpeed, eraseSpeed, delayBeforeErase, delayBeforeType]);

  if (promoLink) {
    return (
      <div className={styles.promotionWrap}>
        <img src={promoLink} alt={promoTitle} loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`${styles.promotionWrap} ${styles.typingContainer}`}>
      <div className={styles.typingContent}>
        <span className={styles.typingText}>{displayText}</span>
        <span className={styles.cursor}>_</span>
      </div>
    </div>
  );
};

export default Promotion;