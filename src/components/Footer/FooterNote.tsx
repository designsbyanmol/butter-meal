import React from 'react';
import Styles from './FooterNote.module.scss';

interface FooterNoteProps {
    companyName: string;
    year: number;
}

const FooterNote:React.FC<FooterNoteProps> = ({companyName, year}) => {
  return (
    <div className={Styles.bm_footer}>© {year} {companyName} - All right reserved</div>
  )
}

export default FooterNote;