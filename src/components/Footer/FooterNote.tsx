import React from 'react';
import Styles from './FooterNote.module.scss';
import { Copyright } from '../../assets/svgs';

interface FooterNoteProps {
    companyName: string;
    year: number;
}

const FooterNote:React.FC<FooterNoteProps> = ({companyName, year}) => {
  return (
    <div className={Styles.bm_footer}><Copyright width={14} height={14}/> {year} {companyName} - All right reserved</div>
  )
}

export default FooterNote;