// components/Admin/AdminPanelSettingsMenu.tsx
import React from 'react';
import {
  DropdownMenu,
  DropdownItem,
  IconButton,
} from '../ui';
import { SettingsIcon } from '../../assets/svgs';

interface AdminPanelSettingsMenuProps {
  onEditLabels: () => void;
  onExport: () => void;
  onImport: () => void;
  onSampleImport: () => void;
  exportDisabled?: boolean;
  importDisabled?: boolean;
  sampleDisabled?: boolean;
}

const AdminPanelSettingsMenu: React.FC<AdminPanelSettingsMenuProps> = ({
  onEditLabels,
  onExport,
  onImport,
  onSampleImport,
  exportDisabled,
  importDisabled,
  sampleDisabled,
}) => (
  <DropdownMenu
    minWidth={200}
    trigger={({ toggle }) => (
      <IconButton
        variant="ghost"
        size="md"
        aria-label="Menu settings"
        tooltip="Menu settings"
        onClick={toggle}
      >
        <SettingsIcon width={18} height={18} fill="#4d4d4d" />
      </IconButton>
    )}
  >
    {({ close }) => (
      <>
        <DropdownItem onClick={() => { close(); onEditLabels(); }}>
          Edit Item Labels
        </DropdownItem>
        <DropdownItem
          disabled={exportDisabled}
          onClick={() => { close(); onExport(); }}
        >
          Export Menu List
        </DropdownItem>
        <DropdownItem
          disabled={importDisabled}
          onClick={() => { close(); onImport(); }}
        >
          Import Menu List
        </DropdownItem>
        <DropdownItem
          disabled={sampleDisabled}
          onClick={() => { close(); onSampleImport(); }}
        >
          Sample List Import
        </DropdownItem>
      </>
    )}
  </DropdownMenu>
);

export default AdminPanelSettingsMenu;