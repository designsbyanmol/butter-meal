import React from "react";
import styles from "./BrandInfo.module.scss";

interface BrandInfoProps {
  brandName : string;
  brandDesc  ?: string;
}

const BrandInfo: React.FC<BrandInfoProps> = ({brandName, brandDesc}) => {
  return (
    <div className={styles.brandWrap}>
      <h1>
        {brandName}
      </h1>
      <div className={styles.subhead}>
        <span>{brandDesc}</span>
      </div>
    </div>
  );
};

export default BrandInfo;
