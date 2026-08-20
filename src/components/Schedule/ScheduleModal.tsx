import React, { useState } from 'react';
import { CalendarIcon, ClockIcon, CloseIcon } from '../../assets/svgs';
import styles from './ScheduleModal.module.scss';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string, time: string) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSave }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!date || !time) {
      alert('Please select both date and time for scheduled delivery.');
      return;
    }
    onSave(date, time);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>
            <CalendarIcon width={20} height={20} fill="#1e1e1e" />
            Set Your Delivery
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <CloseIcon width={24} height={24} fill="#4d4d4d" />
          </button>
        </div>
        
        <p>We'd be happy to schedule your delivery between 9 AM and 9 PM! Kindly note that confirmation is subject to the restaurant's availability during your preferred time slot.</p>
        
        <label>Date</label>
        <input 
          type="date" 
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        
        <label>Time (24hr)</label>
        <input 
          type="time" 
          value={time}
          onChange={(e) => setTime(e.target.value)}
          step="900"
        />
        
        <div className={styles.warning}>
          <ClockIcon width={14} height={14} fill="#1e1e1e" />
          <span>Prepaid only · Remind us before 1hr</span>
        </div>
        
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button className={styles.btnSave} onClick={handleSave}>Save Schedule</button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;