import { FC } from 'react';
import { Home, Users, MessageSquare, Wallet, Bell } from 'lucide-react';
import styles from '../styles.module.css';

interface TabBarProps {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
}

const TabBar: FC<TabBarProps> = ({ activeTab, setActiveTab }) => {
  const tabs: Array<{ name: TabName; icon: any }> = [
    { name: 'Home', icon: Home },
    { name: 'Friends', icon: Users },
    { name: 'Messages', icon: MessageSquare },
    { name: 'Wallet', icon: Wallet },
    { name: 'Notifications', icon: Bell }
  ];

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <div
            key={tab.name}
            className={`${styles.tab} ${activeTab === tab.name ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.name)}
          >
            <Icon
              size={20}
              color={activeTab === tab.name ? '#3b82f6' : '#9ca3af'}
              className={styles.tabIcon}
            />
          </div>
        );
      })}
    </div>
  );
}

export default TabBar;

export type TabName = 'Home' | 'Friends' | 'Messages' | 'Wallet' | 'Notifications';

