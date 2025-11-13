import { FC } from 'react';
import styles from '../styles.module.css';

const LoadingScreen: FC = () => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <div className={styles.loadingText}>Connecting to Rotur...</div>
    </div>
  );
};

export default LoadingScreen;

