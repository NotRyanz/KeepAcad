import React, { useState } from 'react';
import { IconButton } from './Buttons';
import SettingsSheet from './SettingsSheet';

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="settings-outline" onPress={() => setOpen(true)} />
      <SettingsSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
