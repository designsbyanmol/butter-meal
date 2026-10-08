// components/Schedule/ScheduleModal.tsx
import React, { useState } from 'react';
import { Sheet, Button, FormField, Input, Banner } from '../ui';
import { CalendarIcon, ClockIcon } from '../../assets/svgs';
import local from './ScheduleModal.module.scss';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string, time: string) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!date || !time) {
      setError('Please select both date and time for scheduled delivery.');
      return;
    }
    onSave(date, time);
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className={local.titleRow}>
          <CalendarIcon width={20} height={20} fill="#1e1e1e" />
          Set Your Delivery
        </span>
      }
      maxHeightVh={80}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} block>
            Save Schedule
          </Button>
        </>
      }
    >
      <p className={local.intro}>
        We'd be happy to schedule your delivery between 9 AM and 9 PM! Kindly
        note that confirmation is subject to the restaurant's availability
        during your preferred time slot.
      </p>

      <FormField label="Date">
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setError('');
          }}
          min={minDate}
          invalid={!!error && !date}
        />
      </FormField>

      <FormField label="Time (24hr)">
        <Input
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            setError('');
          }}
          step={900}
          invalid={!!error && !time}
        />
      </FormField>

      <Banner
        variant="warning"
        inline
        icon={<ClockIcon width={14} height={14} fill="#92400e" />}
      >
        Prepaid only . Remind us before 1hr
      </Banner>

      {error && (
        <Banner variant="error" inline onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}
    </Sheet>
  );
};

export default ScheduleModal;