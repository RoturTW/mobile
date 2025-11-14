import React from 'react';
import { TabName } from './TabBar';
import { Home, Users, MessageSquare, Landmark, Bell } from 'lucide-react';
import styles from '../styles.module.css';

interface Props {
  activeTab: TabName;
  onChange: (tab: TabName) => void;
}

export default function Sidebar({ activeTab, onChange }: Props) {
  const Item = ({ tab, icon }: { tab: TabName; icon: React.ReactElement }) => (
    <div
      className={`${styles.desktopSidebarItem} ${activeTab === tab ? styles.desktopSidebarItemActive : ''}`}
      onClick={() => onChange(tab)}
    >
      {icon}
      <span className={styles.desktopSidebarLabel}>{tab}</span>
    </div>
  );

  return (
    <div className={styles.desktopSidebar}>
      <Item tab={'Home'} icon={<Home size={18} color={activeTab === 'Home' ? 'var(--primary)' : 'var(--muted)'} />} />
      <Item tab={'Friends'} icon={<Users size={18} color={activeTab === 'Friends' ? 'var(--primary)' : 'var(--muted)'} />} />
      <Item tab={'Messages'} icon={<MessageSquare size={18} color={activeTab === 'Messages' ? 'var(--primary)' : 'var(--muted)'} />} />
      <Item tab={'Wallet'} icon={<Landmark size={18} color={activeTab === 'Wallet' ? 'var(--primary)' : 'var(--muted)'} />} />
      <Item tab={'Notifications'} icon={<Bell size={18} color={activeTab === 'Notifications' ? 'var(--primary)' : 'var(--muted)'} />} />
    </div>
  );
}

