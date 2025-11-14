import React, { useState, useEffect, FC, ReactElement, useCallback, useRef, useSyncExternalStore } from 'react';
import rotur from './rotur';
import claw from './claw';
import TabBar, { TabName } from './components/TabBar';
import Sidebar from './components/Sidebar';
import PostItem from './components/PostItem';
import LoadingScreen from './components/LoadingScreen';
import ProfilePage from './components/ProfilePage';
import { LogOut, MessageSquare, Plus, ChevronLeft, Send, ArrowLeft, Star, TrendingUp, Heart, X, Check, XCircle, Dice6, ArrowUpCircle, ArrowDownCircle, Landmark, Coins, Handshake, Users, UserPlus, Repeat, Reply as ReplyIcon, Bell } from 'lucide-react';
import styles from './styles.module.css';
import { Post, Reply, Transaction } from './interfaces';
import utils from './utils';
import useViewport from './hooks/useViewport';

const formatTimestamp = utils.formatTimestamp;

// localStorage helper functions
const storage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Failed to set item:', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to remove item:', e);
    }
  }
};


export default function App(): ReactElement {
  const [appState, setAppState] = useState<AppState>('loading');

  const userState = useState<UserData | null>(null);
  const [userData, setUserData] = userState;

  const pageState = useState<string>('None');
  const [, setActivePage] = pageState;

  const initializeRotur = React.useCallback((username: string): void => {
    rotur.setUsername(username);
    rotur.linkRoom(['roturTW']);
  }, []);

  const checkAuthentication = React.useCallback(async (): Promise<void> => {
    try {
      const token = storage.getItem('rotur_auth_token');
      if (token) {
        const data: ApiUserResponse = await rotur.fetchUserData(token);
        if (data) {
          setUserData({ token, ...data });
          initializeRotur(data.username);
          setTimeout(() => setAppState('main'), 2000);
        } else {
          storage.removeItem('rotur_auth_token');
          setAppState('auth');
        }
        claw.setAuth(token);
      } else {
        setAppState('auth');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAppState('auth');
    }
  }, [initializeRotur]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  const handleAuthComplete = async (token: string, username?: string): Promise<void> => {
    try {
      console.log('Authentication completed with token:', token.substring(0, 10) + '...');
      const data: ApiUserResponse = await rotur.fetchUserData(token);

      const finalUsername = username || data?.username;
      console.log('Setting user data for:', finalUsername);

      if (data) {
        setUserData({ token, ...data });
        claw.setAuth(token);
        setAppState('loading');
        initializeRotur(finalUsername);
        setTimeout(() => setAppState('main'), 2000);
      } else {
        setAppState('auth');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setAppState('auth');
    }
  };

  const handleLogout = async (): Promise<void> => {
    storage.removeItem('rotur_auth_token');
    storage.removeItem('rotur_username');
    setUserData(null);
    setAppState('auth');
  };

  const handleFriendsPress = (): void => {
    setActivePage('Add Friend');
  };

  return (
    <>
      {appState === 'loading' && <LoadingScreen />}
      {appState === 'auth' && <AuthScreen onAuthComplete={handleAuthComplete} />}
      {appState === 'main' && userData && (
        <MainApp
          username={userData.username}
          onLogout={handleLogout}
          onFriendsPress={handleFriendsPress}
          pageState={pageState}
          userState={userState}
          token={userData.token}
        />
      )}
    </>
  );
}

// Types
type AppState = 'loading' | 'auth' | 'main';
type ClawView = 'feed' | 'profile' | 'post' | 'following' | 'top' | 'premium';

interface UserData {
  token: string;
  username: string;
  bio?: string;
  "sys.friends"?: string[];
  "sys.requests"?: string[];
  created?: number;
  "sys.currency"?: number;
  "sys.marriage"?: {
    partner: string,
    proposer: string,
    status: string,
    timestamp: number
  } | null;
  "sys.transactions"?: Transaction[];
  [key: string]: any;
}

interface AuthMessage {
  type: string;
  token: string;
  username: string;
}

interface ApiUserResponse {
  username: string;
  bio?: string;
  "sys.friends": string[];
  "sys.requests": string[];
  created: number;
  [key: string]: any;
}

interface ProfileData {
  username: string;
  bio?: string;
  followers?: number;
  followed?: boolean;
  posts?: Post[];
}

// Auth Screen with iframe
interface AuthScreenProps {
  onAuthComplete: (token: string, username: string) => void;
}

const AuthScreen: FC<AuthScreenProps> = ({ onAuthComplete }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only accept messages from rotur.dev
      if (event.origin !== 'https://rotur.dev' && event.origin !== window.location.origin) {
        return;
      }

      try {
        let data: AuthMessage;

        if (typeof event.data === 'string') {
          data = JSON.parse(event.data);
        } else {
          data = event.data;
        }

        if (data.type === 'rotur-auth-token' || data.token) {
          console.log('Auth token received');
          const token = data.token;
          const username = data.username || 'user';

          storage.setItem('rotur_auth_token', token);
          storage.setItem('rotur_username', username);
          onAuthComplete(token, username);
        }
      } catch (error) {
        console.error('Auth error:', error);
      }
    };

    // Check URL for token on mount
    const checkUrlForToken = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = urlParams.get('token') || urlParams.get('auth_token') || hashParams.get('token') || hashParams.get('auth_token');
      const username = urlParams.get('username') || urlParams.get('user') || hashParams.get('username') || hashParams.get('user');

      if (token) {
        storage.setItem('rotur_auth_token', token);
        storage.setItem('rotur_username', username || 'user');
        onAuthComplete(token, username || 'user');
      }
    };

    window.addEventListener('message', handleMessage);
    checkUrlForToken();

    // Poll for URL changes (for iframe navigation)
    const interval = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        try {
          const iframeUrl = iframeRef.current.contentWindow.location.href;
          if (iframeUrl.includes('token=') || iframeUrl.includes('auth_token=')) {
            const url = new URL(iframeUrl);
            const token = url.searchParams.get('token') || url.searchParams.get('auth_token');
            const username = url.searchParams.get('username') || url.searchParams.get('user');
            if (token) {
              storage.setItem('rotur_auth_token', token);
              storage.setItem('rotur_username', username || 'user');
              onAuthComplete(token, username || 'user');
            }
          }
        } catch {
          // Cross-origin, can't access iframe URL
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [onAuthComplete]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe
        ref={iframeRef}
        src="https://rotur.dev/auth?system=originOS"
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        title="Authentication"
      />
    </div>
  );
}

// Claw Sidebar Component
interface ClawSidebarProps {
  currentView: ClawView;
  onViewChange: (view: ClawView) => void;
  username: string;
  onProfilePress: (username: string) => void;
  orientation?: 'vertical' | 'horizontal';
  placement?: 'bottom' | 'inline';
}

const ClawSidebar: FC<ClawSidebarProps> = ({ currentView, onViewChange, orientation = 'vertical', placement = 'bottom' }) => {
  const wrapperClass = orientation === 'horizontal'
    ? (placement === 'inline' ? styles.clawTabsRow : styles.clawBottomBar)
    : styles.clawSidebar;
  const activeClass = orientation === 'horizontal'
    ? (placement === 'inline' ? styles.clawInlineActive : styles.clawBottomActive)
    : styles.sidebarButtonActive;
  return (
    <div className={wrapperClass}>
      <div
        className={`${styles.sidebarButton} ${currentView === 'feed' ? activeClass : ''}`}
        onClick={() => onViewChange('feed')}
      >
        <MessageSquare size={20} color={currentView === 'feed' ? '#3b82f6' : '#9ca3af'} />
      </div>

      <div
        className={`${styles.sidebarButton} ${currentView === 'following' ? activeClass : ''}`}
        onClick={() => onViewChange('following')}
      >
        <Star size={20} color={currentView === 'following' ? '#3b82f6' : '#9ca3af'} />
      </div>

      <div
        className={`${styles.sidebarButton} ${currentView === 'top' ? activeClass : ''}`}
        onClick={() => onViewChange('top')}
      >
        <TrendingUp size={20} color={currentView === 'top' ? '#3b82f6' : '#9ca3af'} />
      </div>

      <div
        className={`${styles.sidebarButton} ${currentView === 'premium' ? activeClass : ''}`}
        onClick={() => onViewChange('premium')}
      >
        <span className={styles.roturIcon}>R</span>
      </div>
    </div>
  );
};

const MemoizedPostItem = React.memo(PostItem, (prevProps, nextProps) => {
  const prevLen = (prevProps.post.original_post ? prevProps.post.original_post.likes?.length : prevProps.post.likes?.length) || 0;
  const nextLen = (nextProps.post.original_post ? nextProps.post.original_post.likes?.length : nextProps.post.likes?.length) || 0;
  return (
    prevProps.post.id === nextProps.post.id &&
    prevLen === nextLen &&
    prevProps.currentUsername === nextProps.currentUsername
  );
});

//

// Main App with Tabs
interface MainAppProps {
  username: string;
  onLogout: () => void;
  onFriendsPress: () => void;
  token: string;
  userState: [UserData | null, React.Dispatch<React.SetStateAction<UserData | null>>];
  pageState: [string, React.Dispatch<React.SetStateAction<string>>];
}

const MainApp: FC<MainAppProps> = ({ userState, onLogout, onFriendsPress, pageState, token }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [friends, setFriends] = useState<string[]>([]);
  const [requests, setRequests] = useState<string[]>([]);
  const [friendsQuery, setFriendsQuery] = useState<string>('');
  const [page, setPage] = pageState;
  const [usernameToRequest, setUsernameToRequest] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = userState;

  // Bio related state
  const [bio, setBio] = useState<string>('');
  const [newBio, setNewBio] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Claw feed state
  const [clawView, setClawView] = useState<ClawView>('feed');
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [postingContent, setPostingContent] = useState<boolean>(false);
  const [attachment, setAttachment] = useState<string>('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [postingReply, setPostingReply] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  const [followersCount, setFollowersCount] = useState<number>(0);
  const [balanceDeltaWeek, setBalanceDeltaWeek] = useState<number>(0);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [blockInput, setBlockInput] = useState<string>('');
  const [statusContent, setStatusContent] = useState<string>('');
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [friendsView, setFriendsView] = useState<'friends' | 'blocked'>('friends');
  const [transferTo, setTransferTo] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [sendingTransfer, setSendingTransfer] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);
  const [imageOverlay, setImageOverlay] = useState<string>('');
  const [limits, setLimits] = useState<{
    content_length: number;
    content_length_premium: number;
    attachment_length: number;
  } | null>(null);
  const [marriageStatus, setMarriageStatus] = useState<any>(null);
  const [, setLoadingMarriage] = useState<boolean>(false);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);

  const posts = useSyncExternalStore(claw.subscribe, claw.getSnapshot);

  useEffect(() => {
    claw.connect();
  }, []);

  // Fetch limits from API
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch('https://api.rotur.dev/limits');
        const data = await response.json();
        setLimits(data);
      } catch (err) {
        console.error('Failed to fetch limits:', err);
        // Fallback to default values if API fails
        setLimits({
          content_length: 300,
          content_length_premium: 600,
          attachment_length: 200
        });
      }
    };
    fetchLimits();
  }, []);

  const maxPostLength = limits
    ? (isPremium ? limits.content_length_premium : limits.content_length)
    : (isPremium ? 600 : 300);

  const username = user?.username || 'User';

  const handleSendRequest = async (): Promise<void> => {
    try {
      setError('');
      setSuccess('');
      const message = await rotur.sendFriendRequest(token, usernameToRequest.trim());
      setSuccess(message);
      setUsernameToRequest('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleBioUpdate = async (): Promise<void> => {
    if (!newBio.trim()) return;
    setUpdating(true);
    try {
      await rotur.updateUser(token, 'bio', newBio.trim());
      setBio(newBio.trim());
      if (user) {
        setUser({ ...user, bio: newBio.trim() });
      }
      setSuccess('Bio updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Bio update failed:', err);
      setError('Failed to update bio');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUpdating(false);
    }
  };

  const handlePrivacyToggle = async (): Promise<void> => {
    try {
      const next = !user?.private;
      await rotur.updateUser(token, 'private', next);
      if (user) setUser({ ...user, private: next });
      setSuccess(next ? 'Account set to private' : 'Account set to public');
    } catch {
      setError('Failed to update privacy');
    }
  };

  const handleAcceptRequest = async (uname: string): Promise<void> => {
    try {
      await rotur.acceptFriendRequest(token, uname);
      setRequests(prev => prev.filter(u => u !== uname));
      setFriends(prev => [...prev, uname]);
      setSuccess('Friend request accepted');
    } catch {
      setError('Failed to accept request');
    }
  };

  const handleRejectRequest = async (uname: string): Promise<void> => {
    try {
      await rotur.rejectFriendRequest(token, uname);
      setRequests(prev => prev.filter(u => u !== uname));
      setSuccess('Friend request rejected');
    } catch {
      setError('Failed to reject request');
    }
  };

  const handleRemoveFriend = async (uname: string): Promise<void> => {
    try {
      await rotur.removeFriend(token, uname);
      setFriends(prev => prev.filter(u => u !== uname));
      setSuccess('Removed friend');
    } catch {
      setError('Failed to remove friend');
    }
  };

  const handleBlockUser = async (): Promise<void> => {
    const uname = blockInput.trim();
    if (!uname) return;
    try {
      await rotur.blockUser(token, uname);
      const list = await rotur.getBlocking(token);
      setBlockedUsers(list);
      setBlockInput('');
      setSuccess('User blocked');
    } catch {
      setError('Failed to block user');
    }
  };

  const handleUnblockUser = async (uname: string): Promise<void> => {
    try {
      await rotur.unblockUser(token, uname);
      setBlockedUsers(prev => prev.filter(u => u !== uname));
      setSuccess('User unblocked');
    } catch {
      setError('Failed to unblock user');
    }
  };

  const handleSetStatus = async (): Promise<void> => {
    const content = statusContent.trim();
    if (!content) return;
    try {
      await rotur.updateStatus(token, { content });
      setSuccess('Status updated');
      setStatusContent('');
    } catch {
      setError('Failed to update status');
    }
  };

  const handleClearStatus = async (): Promise<void> => {
    try {
      await rotur.clearStatus(token);
      setSuccess('Status cleared');
    } catch {
      setError('Failed to clear status');
    }
  };

  useEffect(() => {
    const checkPremium = async () => {
      try {
        const response = await fetch(
          `https://api.rotur.dev/keys/check/${user?.username}?key=bd6249d2b87796a25c30b1f1722f784f`
        );
        const data = await response.json();
        setIsPremium(data.owned || false);
      } catch (err) {
        console.error('Failed to check premium:', err);
      }
    };

    if (user?.username) {
      checkPremium();
    }
  }, [user?.username]);

  const fetchClawFeed = async (viewType: ClawView = 'feed'): Promise<void> => {
    setLoadingPosts(true);
    try {
      let url = 'https://api.rotur.dev/';

      switch (viewType) {
        case 'feed':
          setSelectedPost(null);
          setSelectedProfile(null);
          setLoadingPosts(false);
          return;
        case 'following':
          url += `following_feed?auth=${token}`;
          break;
        case 'top':
          url += 'top_posts?time_period=168';
          break;
        default:
          url += 'feed?limit=50&offset=0';
      }

      const response = await fetch(url);
      const data: Post[] = await response.json();
      claw.replaceFeed(data);
      setSelectedPost(null);
      setSelectedProfile(null);
    } catch (err) {
      console.error('Failed to fetch feed:', err);
      setError('Failed to load feed');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handlePostContent = async (): Promise<void> => {
    if (!newPostContent.trim() || newPostContent.length > maxPostLength) {
      setError(`Post content must be between 1 and ${maxPostLength} characters`);
      return;
    }

    setPostingContent(true);
    setError('');

    try {
      const encodedContent = encodeURIComponent(newPostContent.trim());
      let url = `https://api.rotur.dev/post?auth=${token}&content=${encodedContent}&os=rotur`;

      if (attachment) {
        url += `&attachment=${encodeURIComponent(attachment)}`;
      }

      const response = await fetch(url, { method: 'GET' });

      if (response.ok) {
        setSuccess('Posted successfully!');
        setNewPostContent('');
        setAttachment('');
        setTimeout(() => setSuccess(''), 3000);
        await fetchClawFeed(clawView);
      } else {
        setError('Failed to post content');
      }
    } catch (err) {
      console.error('Post error:', err);
      setError('Failed to post content');
    } finally {
      setPostingContent(false);
    }
  };

  // Reply to post
  const handleReplyToPost = async (): Promise<void> => {
    if (!replyContent.trim() || !selectedPost) return;

    setPostingReply(true);
    try {
      const encodedContent = encodeURIComponent(replyContent.trim());
      const url = `https://api.rotur.dev/reply?id=${selectedPost.id}&auth=${token}&content=${encodedContent}`;

      const response = await fetch(url);
      if (response.ok) {
        setSuccess('Reply posted!');
        setReplyContent('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to post reply');
      }
    } catch (err) {
      console.error('Reply error:', err);
      setError('Failed to post reply');
    } finally {
      setPostingReply(false);
    }
  };

  const handlePostPress = useCallback((post: Post) => {
    setActiveTab('Messages');
    setSelectedPost(post);
    setViewingProfile(null);
  }, []);

  const handleProfilePress = useCallback((username: string) => {
    setViewingProfile(username);
  }, []);

  const handleNotificationPress = useCallback((n: any) => {
    const t = String(n.type || '').toLowerCase();
    const actor = n.user || n.username || n.follower || '';
    switch (t) {
      case 'follow':
        handleProfilePress(actor);
        break;
      case 'reply':
        handlePostPress(claw.allPosts[n.post_id] || {});
        break;
      case 'repost':
        handlePostPress(claw.allPosts[n.post_id] || {});
        break;
      default:
        break;
    }
  }, [handleProfilePress, handlePostPress]);

  const handleLikePost = useCallback(async (postId: string, isLiked: boolean) => {
    try {
      const rating = isLiked ? 0 : 1;
      await fetch(`https://api.rotur.dev/rate?auth=${token}&id=${postId}&rating=${rating}`);

      claw.likePostOptimistic(postId, user?.username.toLowerCase() || '', isLiked);
    } catch (err) {
      console.error('Like error:', err);
    }
  }, [token, user?.username]);

  const handleRepost = useCallback(async (postId: string) => {
    try {
      await fetch(`https://api.rotur.dev/repost?auth=${token}&id=${postId}`);
      setSuccess('Reposted!');
      setTimeout(() => setSuccess(''), 3000);
      await fetchClawFeed(clawView);
    } catch (err) {
      console.error('Repost error:', err);
    }
  }, [token, clawView]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await fetch(`https://api.rotur.dev/delete?auth=${token}&id=${postId}`);
      setSuccess('Post deleted!');
      setTimeout(() => setSuccess(''), 3000);
      claw.deletePostOptimistic(postId);
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }, [token, selectedPost?.id]);

  const renderNotificationItem = (n: any, idx: number): ReactElement => {
    const t = String(n.type || '').toLowerCase();
    const actor = n.user || n.username || n.follower || '';
    let icon: ReactElement;
    let message: string;

    switch (t) {
      case 'follow':
        icon = <UserPlus size={16} color="#9ca3af" />;
        message = actor ? `${actor} followed you` : 'New follower';
        break;
      case 'reply':
        icon = <ReplyIcon size={16} color="#9ca3af" />;
        message = actor ? `${actor} replied to your post` : 'New reply';
        break;
      case 'repost':
        icon = <Repeat size={16} color="#9ca3af" />;
        message = actor ? `${actor} reposted your post` : 'New repost';
        break;
      default:
        icon = <Bell size={16} color="#9ca3af" />;
        message = String(n.type || 'Notification');
        break;
    }

    const ts = n.timestamp || (n.time || Date.now());

    return (
      <div key={idx} className={styles.postItem} onClick={() => handleNotificationPress(n)}>
        <div className={styles.postHeader}>
          {actor && (
            <img src={`https://avatars.rotur.dev/${actor}`} alt={actor} className={styles.postAvatar} />
          )}
          <div className={styles.postUsername}>
            {icon} {message}
          </div>
        </div>
        <div className={styles.postTimestamp}>{formatTimestamp(ts)}</div>
      </div>
    );
  };

  const renderPost = useCallback((item: Post) => (
    <MemoizedPostItem
      key={item.id}
      post={item}
      currentUsername={username}
      token={token}
      onPostPress={handlePostPress}
      onProfilePress={handleProfilePress}
      onLike={handleLikePost}
      onRepost={handleRepost}
      onDelete={handleDeletePost}
      friends={friends}
    />
  ), [username, token, handlePostPress, handleProfilePress, handleLikePost, handleRepost, handleDeletePost]);

  // Load profile
  const handleLoadProfile = async (username: string): Promise<void> => {
    setLoadingPosts(true);
    try {
      const data: ProfileData = await claw.getUser(username);
      setSelectedProfile(data);
      setSelectedPost(null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoadingPosts(false);
    }
  };

  // Premium subscribe/unsubscribe
  const handlePremiumToggle = async (): Promise<void> => {
    try {
      const action = isPremium ? 'cancel' : 'buy';
      const response = await fetch(
        `https://api.rotur.dev/keys/${action}/bd6249d2b87796a25c30b1f1722f784f?auth=${token}`
      );
      const data = await response.json();

      if (data.message) {
        setSuccess(data.message);
        setIsPremium(!isPremium);
      } else if (data.error) {
        setError(data.error);
      }

      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
    } catch (err) {
      console.error('Premium toggle error:', err);
      setError('Failed to process request');
    }
  };

  useEffect(() => {
    if (page === 'Add Friend') {
      setUsernameToRequest('');
    }
    setError('');
    setSuccess('');
  }, [page]);

  // Load feed when switching to Messages tab
  useEffect(() => {
    if (activeTab === 'Messages' && posts.length === 0) {
      fetchClawFeed('feed');
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchNotifications = async (): Promise<void> => {
      setLoadingNotifications(true);
      try {
        const res = await fetch(`https://api.rotur.dev/notifications?after=1000&auth=${token}`);
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load notifications');
      } finally {
        setLoadingNotifications(false);
      }
    };

    if (activeTab === 'Notifications' && notifications.length === 0) {
      fetchNotifications();
    }
  }, [activeTab, token]);

  useEffect(() => {
    const loadMetrics = async (): Promise<void> => {

      try {
        const profile = await claw.getUser(username);
        setFollowersCount(Number(profile?.followers || 0));
      } catch {
        setFollowersCount(0);
      }

      const txs: Transaction[] = user?.["sys.transactions"] || [];
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      let delta = 0;
      for (const t of txs) {
        if (t.time >= weekAgo) {
          if (t.type === 'in') delta += t.amount;
          else if (t.type === 'out') delta -= t.amount;
          else if (t.type === 'gamble') {
            const won = String(t.note || '').toLowerCase().includes('won');
            delta += won ? t.amount : -t.amount;
          }
        }
      }
      setBalanceDeltaWeek(delta);
    };

    if (user) {
      loadMetrics();
    }
  }, [user, username, notifications]);

  useEffect(() => {
    if (friendsView === 'blocked') {
      (async () => {
        const list = await rotur.getBlocking(token);
        setBlockedUsers(list);
      })();
    }
  }, [friendsView, token]);

  useEffect(() => {
    if (page === 'Blocking') {
      (async () => {
        const list = await rotur.getBlocking(token);
        setBlockedUsers(list);
      })();
    }
  }, [page, token]);

  function changeTab(tab: TabName) {
    setActiveTab(tab);
    setPage("None");
    setViewingProfile(null);
    setError('');
    setSuccess('');
  }

  function onBackPress() {
    setPage("None");
  }

  // Fetch user data including friends and bio
  useEffect(() => {
    const fetchUserData = async () => {
      const data: ApiUserResponse = await rotur.fetchUserData(token);
      if (data) {
        setFriends(data["sys.friends"] || []);
        setRequests(data["sys.requests"] || []);
        if (data.bio) {
          setBio(data.bio);
          setNewBio(data.bio);
        }
      }
    };

    fetchUserData();
  }, [token]);

  // Fetch marriage status
  useEffect(() => {
    const fetchMarriageStatus = async () => {
      setLoadingMarriage(true);
      try {
        const status = await rotur.getMarriageStatus(token);
        setMarriageStatus(status);
      } catch (err) {
        console.error('Failed to fetch marriage status:', err);
      } finally {
        setLoadingMarriage(false);
      }
    };

    if (token) {
      fetchMarriageStatus();
    }
  }, [token]);

  // Marriage action handlers
  // Removed propose action from Friends tab per request

  const handleAcceptMarriage = async (): Promise<void> => {
    try {
      setError('');
      await rotur.acceptMarriage(token);
      setSuccess('Marriage accepted! 💍');
      setTimeout(() => setSuccess(''), 3000);
      // Refresh user data and marriage status
      const data = await rotur.fetchUserData(token);
      if (data && user) {
        setUser({ ...user, ...data });
      }
      const status = await rotur.getMarriageStatus(token);
      setMarriageStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept marriage');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRejectMarriage = async (): Promise<void> => {
    try {
      setError('');
      await rotur.rejectMarriage(token);
      setSuccess('Marriage proposal rejected');
      setTimeout(() => setSuccess(''), 3000);
      const status = await rotur.getMarriageStatus(token);
      setMarriageStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject marriage');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCancelMarriage = async (): Promise<void> => {
    try {
      setError('');
      await rotur.cancelMarriage(token);
      setSuccess('Marriage proposal cancelled');
      setTimeout(() => setSuccess(''), 3000);
      const status = await rotur.getMarriageStatus(token);
      setMarriageStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel marriage');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDivorce = async (): Promise<void> => {
    if (!confirm('Are you sure you want to divorce? This action cannot be undone.')) {
      return;
    }
    try {
      setError('');
      await rotur.divorceMarriage(token);
      setSuccess('Divorced');
      setTimeout(() => setSuccess(''), 3000);
      // Refresh user data and marriage status
      const data = await rotur.fetchUserData(token);
      if (data && user) {
        setUser({ ...user, ...data });
      }
      const status = await rotur.getMarriageStatus(token);
      setMarriageStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to divorce');
      setTimeout(() => setError(''), 3000);
    }
  };

  useEffect(() => {
    if (activeTab === 'Messages' && clawView !== 'premium' && clawView !== 'profile' && selectedProfile === null && !selectedPost) {
      fetchClawFeed(clawView);
    }
  }, [clawView, activeTab, selectedProfile, selectedPost]);

  const renderContent = (): ReactElement => {
    const marriage = user?.["sys.marriage"] || false;

    if (viewingProfile) {
      return (
        <ProfilePage
          username={viewingProfile}
          currentUsername={username}
          token={token}
          onBack={() => setViewingProfile(null)}
          onProfilePress={handleProfilePress}
          onPostPress={handlePostPress}
          onLike={handleLikePost}
          onRepost={handleRepost}
          onDelete={handleDeletePost}
          isFriend={friends.some(f => f.toLowerCase() === viewingProfile.toLowerCase())}
        />
      );
    }

    if (page !== "None") {
      switch (page) {
        case 'Add Friend':
          return (
            <div className={styles.viewContent}>
              <div className={styles.backButtonAbs} onClick={onBackPress}>
                <ChevronLeft size={24} color="#9ca3af" />
              </div>
              <div className={styles.pageHeader}>Add Friend</div>
              <input
                className={styles.input}
                type="text"
                placeholder="Enter username"
                value={usernameToRequest}
                onChange={(e) => setUsernameToRequest(e.target.value)}
              />
              <div className={styles.addButton} onClick={handleSendRequest}>
                <span className={styles.buttonText}>Send Request</span>
              </div>
              {error && <div className={styles.errorText}>{error}</div>}
              {success && <div className={styles.successText}>{success}</div>}
            </div>
          );
        case 'Manage Friendships':
          return (
            <div className={styles.viewContent}>
              <div className={styles.backButtonAbs} onClick={onBackPress}>
                <ChevronLeft size={24} color="#9ca3af" />
              </div>
              <div className={styles.pageHeader}>Manage Friendships</div>
              {error && <div className={styles.errorText}>{error}</div>}
              {success && <div className={styles.successText}>{success}</div>}

              {requests.length > 0 && (
                <div style={{ width: '100%', marginTop: '10px' }}>
                  <div className={styles.headerText} style={{ fontSize: '18px' }}>Requests</div>
                  {requests.map((u) => (
                    <div key={u} className={styles.friendItem}>
                      <img src={`https://avatars.rotur.dev/${u}`} alt={u} className={styles.friendAvatar} />
                      <div className={styles.friendName} style={{ flex: 1 }}>{u}</div>
                      <div className={styles.marriageActions} style={{ margin: 0 }}>
                        <div className={styles.marriageActionButton + ' ' + styles.marriageActionButtonPrimary} onClick={() => handleAcceptRequest(u)}>
                          <Check size={14} /> Accept
                        </div>
                        <div className={styles.marriageActionButton + ' ' + styles.marriageActionButtonDanger} onClick={() => handleRejectRequest(u)}>
                          <X size={14} /> Reject
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ width: '100%', marginTop: '20px' }}>
                <div className={styles.headerText} style={{ fontSize: '18px' }}>Friends</div>
                {friends
                  .filter(f => f.toLowerCase().includes(friendsQuery.trim().toLowerCase()))
                  .sort((a, b) => a.localeCompare(b))
                  .map((f) => (
                    <div key={f} className={styles.friendItem}>
                      <img src={`https://avatars.rotur.dev/${f}`} alt={f} className={styles.friendAvatar} />
                      <div className={styles.friendName} style={{ flex: 1 }}>{f}</div>
                      <div className={styles.marriageActionButton + ' ' + styles.marriageActionButtonDanger} onClick={() => handleRemoveFriend(f)}>
                        <X size={14} /> Remove
                      </div>
                    </div>
                  ))}
                {friends.length === 0 && (
                  <div className={styles.infoText}>No friends yet</div>
                )}
              </div>

              <div className={styles.addButton} onClick={() => setPage('Blocking')} style={{ marginTop: '10px', width: '100%' }}>
                <span className={styles.buttonText}>Manage Blocking</span>
              </div>
            </div>
          );
        case 'Transfer':
          return (
            <div className={styles.viewContent}>
              <div className={styles.backButtonAbs} onClick={onBackPress}>
                <ChevronLeft size={24} color="#9ca3af" />
              </div>
              <div className={styles.pageHeader}>Transfer</div>
              <input
                className={styles.input}
                type="text"
                placeholder="Enter Rotur username"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
              />
              <input
                className={styles.input}
                type="number"
                placeholder="Amount (credits)"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                min={0.01}
                step={0.01}
              />
              <div className={styles.infoText}>Rotur charges a 1 credit tax per transaction</div>
              <div
                className={styles.addButton}
                onClick={async () => {
                  if (sendingTransfer) return;
                  const to = transferTo.trim();
                  const amt = parseFloat(transferAmount);
                  if (!to) {
                    setError('Recipient username is required');
                    return;
                  }
                  if (to.toLowerCase() === (user?.username || '').toLowerCase()) {
                    setError('Cannot send to yourself');
                    return;
                  }
                  if (isNaN(amt) || amt < 0.01) {
                    setError('Amount must be at least 0.01');
                    return;
                  }
                  setError('');
                  setSuccess('');
                  setSendingTransfer(true);
                  try {
                    const res = await fetch(`https://api.rotur.dev/me/transfer?auth=${token}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ To: to, Amount: amt, Note: '' })
                    });
                    const data = await res.json();
                    if (!res.ok || data.error) {
                      setError(data.error || 'Transfer failed');
                    } else {
                      setSuccess('Transfer sent');
                      setTransferTo('');
                      setTransferAmount('');
                    }
                  } catch {
                    setError('Transfer failed');
                  } finally {
                    setSendingTransfer(false);
                  }
                }}
                style={{ pointerEvents: sendingTransfer ? 'none' : 'auto' }}
              >
                <span className={styles.buttonText}>{sendingTransfer ? 'Sending...' : 'Send'}</span>
              </div>
              {error && <div className={styles.errorText}>{error}</div>}
              {success && <div className={styles.successText}>{success}</div>}
            </div>
          );
        case 'Blocking':
          return (
            <div className={styles.viewContent}>
              <div className={styles.backButtonAbs} onClick={onBackPress}>
                <ChevronLeft size={24} color="#9ca3af" />
              </div>
              <div className={styles.pageHeader}>Blocking</div>
              <input
                className={styles.input}
                type="text"
                placeholder="Enter username to block"
                value={blockInput}
                onChange={(e) => setBlockInput(e.target.value)}
              />
              <div className={styles.addButton} onClick={handleBlockUser}>
                <span className={styles.buttonText}>Block</span>
              </div>
              <div className={styles.headerText} style={{ fontSize: '18px', marginTop: '15px' }}>Blocked Users</div>
              {blockedUsers.map((u) => (
                <div key={u} className={styles.friendItem}>
                  <img src={`https://avatars.rotur.dev/${u}`} alt={u} className={styles.friendAvatar} />
                  <div className={styles.friendName} style={{ flex: 1 }}>{u}</div>
                  <div className={styles.marriageActionButton + ' ' + styles.marriageActionButtonSecondary} onClick={() => handleUnblockUser(u)}>
                    Unblock
                  </div>
                </div>
              ))}
              {error && <div className={styles.errorText}>{error}</div>}
              {success && <div className={styles.successText}>{success}</div>}
            </div>
          );
        default:
          return (
            <div className={styles.viewContent}>
              <div className={styles.backButtonAbs} onClick={onBackPress}>
                <ChevronLeft size={24} color="#9ca3af" />
              </div>
              <div className={styles.pageHeader}>{page}</div>
            </div>
          );
      }
    }

    switch (activeTab) {
      case 'Home':
        return (
          <div className={styles.viewContent} style={{ overflowY: 'auto', paddingBottom: '60px' }}>
            <div className={styles.topRightIcon} onClick={onLogout}>
              <LogOut size={24} color="#9ca3af" />
            </div>
            <div className={styles.contentWidth}>
              <div className={styles.profileContainer}>
                <img
                  src={`https://avatars.rotur.dev/${username}`}
                  alt={username}
                  className={styles.profileImage}
                />
                <div className={styles.profileName}>{username}</div>
              </div>

              {/* Recent Engagement */}
              {(() => {
                const mine = posts.filter(p => (p.user || '').toLowerCase() === (username || '').toLowerCase());
                const latest = [...mine].sort((a, b) => b.timestamp - a.timestamp);
                const likeCount = latest.reduce((acc, cur) => acc + (cur.likes?.length || 0), 0);
                const replyCount = latest.reduce((acc, cur) => acc + (cur.replies?.length || 0), 0);
                return (
                  <div className={styles.metricsGrid}>
                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}><Coins size={16} color="#9ca3af" /> Credits</div>
                      <div className={styles.metricRow}>
                        <div className={styles.metricValue}>{user?.["sys.currency"] ?? 0}</div>
                        {balanceDeltaWeek !== 0 && (
                          <div className={balanceDeltaWeek > 0 ? styles.metricDeltaUp : styles.metricDeltaDown}>
                            {balanceDeltaWeek > 0 ? (
                              <ArrowUpCircle size={16} color="#4ade80" />
                            ) : (
                              <ArrowDownCircle size={16} color="#ef4444" />
                            )}
                            <span>{(balanceDeltaWeek > 0 ? '+' : '') + balanceDeltaWeek.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}><Users size={16} color="#9ca3af" /> Followers</div>
                      <div className={styles.metricValue}>{followersCount}</div>
                    </div>

                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}><Handshake size={16} color="#9ca3af" /> Friends</div>
                      <div className={styles.metricValue}>{friends.length}</div>
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}><Heart size={16} color="#9ca3af" /> Recent Likes</div>
                      <div className={styles.metricValue}>{likeCount}</div>
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricTitle}><MessageSquare size={16} color="#9ca3af" /> Recent Replies</div>
                      <div className={styles.metricValue}>{replyCount}</div>
                    </div>
                  </div>
                );
              })()}

              <div className={styles.homePageContainer}>
                <div className={styles.bioContainer}>
                  <textarea
                    className={styles.bioInput}
                    placeholder="Add a bio..."
                    value={newBio}
                    onChange={(e) => {
                      setNewBio(e.target.value);
                      setError('');
                      setSuccess('');
                    }}
                    maxLength={150}
                  />
                  <div className={styles.bioFooter}>
                    <span className={styles.charCount}>{newBio.length}/150</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div
                        className={`${styles.postButton} ${(!newBio.trim() || newBio === bio || updating) ? styles.postButtonDisabled : ''}`}
                        onClick={handleBioUpdate}
                        style={{ pointerEvents: (!newBio.trim() || newBio === bio || updating) ? 'none' : 'auto' }}
                      >
                        {updating ? 'Saving...' : 'Save Bio'}
                      </div>
                      <div
                        className={`${styles.marriageActionButton} ${styles.marriageActionButtonSecondary}`}
                        onClick={() => setNewBio(bio || '')}
                      >
                        Cancel
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '15px' }}>
                  <div className={styles.addButton} onClick={handlePrivacyToggle}>
                    <span className={styles.buttonText}>{user?.private ? 'Set Public' : 'Set Private'}</span>
                  </div>
                </div>
                <div style={{ marginTop: '15px' }}>
                  <div className={styles.addButton} onClick={() => setStatusModalOpen(true)}>
                    <span className={styles.buttonText}>Edit Status</span>
                  </div>
                </div>
              </div>
            </div>
            {statusModalOpen && (
              <div className={styles.modalOverlay} onClick={() => setStatusModalOpen(false)}>
                <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.modalTitle}>Update Status</div>
                  <textarea
                    className={styles.modalInput}
                    placeholder="What's on your mind?"
                    value={statusContent}
                    onChange={(e) => setStatusContent(e.target.value)}
                    maxLength={maxPostLength}
                  />
                  <div className={styles.modalFooter}>
                    <span className={styles.charCount}>{statusContent.length}/{maxPostLength}</span>
                    <div className={styles.modalActions}>
                      <div
                        className={`${styles.postButton} ${!statusContent.trim() ? styles.postButtonDisabled : ''}`}
                        onClick={() => { handleSetStatus(); setStatusModalOpen(false); }}
                        style={{ pointerEvents: !statusContent.trim() ? 'none' : 'auto' }}
                      >
                        Save
                      </div>
                      <div className={`${styles.marriageActionButton} ${styles.marriageActionButtonSecondary}`} onClick={() => { handleClearStatus(); setStatusModalOpen(false); }}>
                        Clear
                      </div>
                      <div className={`${styles.marriageActionButton} ${styles.marriageActionButtonSecondary}`} onClick={() => setStatusModalOpen(false)}>
                        Cancel
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {error && <div className={styles.errorText}>{error}</div>}
            {success && <div className={styles.successText}>{success}</div>}
          </div>
        );
      case 'Friends':
        return (
          <div className={styles.scrollView} style={{ paddingBottom: '60px' }}>
            <div className={styles.scrollContent}>
              <div className={styles.headerText}>Friends</div>
              <div className={styles.topRightIcon} onClick={onFriendsPress}>
                <Plus size={24} color="#9ca3af" />
              </div>
              {error && <div className={styles.errorText}>{error}</div>}
              {success && <div className={styles.successText}>{success}</div>}

              <input
                className={styles.input}
                type="text"
                placeholder="Search friends"
                value={friendsQuery}
                onChange={(e) => setFriendsQuery(e.target.value)}
              />
              {requests.length > 0 && (
                <div style={{ width: '100%' }}>
                  <div className={styles.headerText} style={{ fontSize: '18px' }}>Requests</div>
                  {requests.map((u) => (
                    <div key={u} className={styles.friendItem}>
                      <img src={`https://avatars.rotur.dev/${u}`} alt={u} className={styles.friendAvatar} />
                      <div className={styles.friendName} style={{ flex: 1 }}>{u}</div>
                      <div className={styles.marriageActions} style={{ margin: 0 }}>
                        <div className={styles.marriageActionButton + ' ' + styles.marriageActionButtonPrimary} onClick={() => handleAcceptRequest(u)}>
                          <Check size={14} /> Accept
                        </div>
                        <div className={styles.marriageActionButton + ' ' + styles.marriageActionButtonDanger} onClick={() => handleRejectRequest(u)}>
                          <X size={14} /> Reject
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Marriage Display */}
              {marriage && (
                <div className={styles.marriageCard}>
                  <div className={styles.marriageCardHeader}>
                    <div className={styles.marriageAvatars}>
                      <img
                        src={`https://avatars.rotur.dev/${username}`}
                        alt={username}
                        className={styles.marriageAvatar}
                      />
                      <img
                        src={`https://avatars.rotur.dev/${marriage.partner}`}
                        alt={marriage.partner}
                        className={`${styles.marriageAvatar} ${styles.marriageAvatarSecond}`}
                      />
                    </div>
                    <div className={styles.marriageInfo}>
                      <div className={styles.marriageTitle}>
                        Married to {marriage.partner}
                      </div>
                    </div>
                  </div>
                  <div className={styles.marriageDetails}>
                    <div className={styles.marriageDetailRow}>
                      <span className={styles.marriageDetailLabel}>Proposed by:</span>
                      <span className={styles.marriageDetailValue}>{marriage.proposer}</span>
                    </div>
                    <div className={styles.marriageDetailRow}>
                      <span className={styles.marriageDetailLabel}>Married since:</span>
                      <span className={styles.marriageDetailValue}>{formatTimestamp(marriage.timestamp)}</span>
                    </div>
                  </div>
                  <div className={styles.marriageActions}>
                    <div
                      className={`${styles.marriageActionButton} ${styles.marriageActionButtonDanger}`}
                      onClick={handleDivorce}
                    >
                      <XCircle size={14} />
                      Divorce
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Marriage Proposals */}
              {marriageStatus && marriageStatus.pending && (
                <div className={styles.marriagePendingCard}>
                  <div className={styles.marriagePendingTitle}>
                    <Heart size={18} color="#fbbf24" />
                    Pending Marriage Proposal
                  </div>
                  {marriageStatus.pending.from && (
                    <div className={styles.marriageCardHeader}>
                      <img
                        src={`https://avatars.rotur.dev/${marriageStatus.pending.from}`}
                        alt={marriageStatus.pending.from}
                        className={styles.marriageAvatar}
                      />
                      <div className={styles.marriageInfo}>
                        <div className={styles.marriageText}>
                          {marriageStatus.pending.from} wants to marry you!
                        </div>
                        <div className={styles.marriageTimestamp}>
                          {formatTimestamp(marriageStatus.pending.timestamp)}
                        </div>
                      </div>
                    </div>
                  )}
                  {marriageStatus.pending.to && (
                    <div className={styles.marriageCardHeader}>
                      <img
                        src={`https://avatars.rotur.dev/${marriageStatus.pending.to}`}
                        alt={marriageStatus.pending.to}
                        className={styles.marriageAvatar}
                      />
                      <div className={styles.marriageInfo}>
                        <div className={styles.marriageText}>
                          You proposed to {marriageStatus.pending.to}
                        </div>
                        <div className={styles.marriageTimestamp}>
                          {formatTimestamp(marriageStatus.pending.timestamp)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={styles.marriageActions}>
                    {marriageStatus.pending.from && (
                      <>
                        <div
                          className={`${styles.marriageActionButton} ${styles.marriageActionButtonPrimary}`}
                          onClick={handleAcceptMarriage}
                        >
                          <Check size={14} />
                          Accept
                        </div>
                        <div
                          className={`${styles.marriageActionButton} ${styles.marriageActionButtonSecondary}`}
                          onClick={handleRejectMarriage}
                        >
                          <X size={14} />
                          Reject
                        </div>
                      </>
                    )}
                    {marriageStatus.pending.to && (
                      <div
                        className={`${styles.marriageActionButton} ${styles.marriageActionButtonSecondary}`}
                        onClick={handleCancelMarriage}
                      >
                        <X size={14} />
                        Cancel Proposal
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.segmentedControl}>
                <div
                  className={`${styles.segmentedTab} ${friendsView === 'friends' ? styles.segmentedTabActive : ''}`}
                  onClick={() => setFriendsView('friends')}
                >
                  Friends
                </div>
                <div
                  className={`${styles.segmentedTab} ${friendsView === 'blocked' ? styles.segmentedTabActive : ''}`}
                  onClick={() => setFriendsView('blocked')}
                >
                  Blocked
                </div>
              </div>

              {/* Friends List */}
              {friendsView === 'friends' ? (
                friends.length > 0 ? (
                  <div className={styles.friendsList}>
                    {friends
                      .filter((f: string) => f.toLowerCase().includes(friendsQuery.trim().toLowerCase()))
                      .sort((a: string, b: string) => a.localeCompare(b))
                      .map((friend: string) => (
                        <div
                          key={friend}
                          className={styles.friendItem}
                          onClick={() => {
                            setViewingProfile(friend);
                          }}
                        >
                          <img
                            src={`https://avatars.rotur.dev/${friend}`}
                            alt={friend}
                            className={styles.friendAvatar}
                          />
                          <div className={styles.friendName}>{friend}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className={styles.infoText}>No friends yet</div>
                )
              ) : (
                <div style={{ width: '100%' }}>
                  <div className={styles.headerText} style={{ fontSize: '18px' }}>Blocked Users</div>
                  {blockedUsers.map((u) => (
                    <div key={u} className={styles.friendItem}>
                      <img src={`https://avatars.rotur.dev/${u}`} alt={u} className={styles.friendAvatar} />
                      <div className={styles.friendName} style={{ flex: 1 }}>{u}</div>
                      <div className={`${styles.marriageActionButton} ${styles.marriageActionButtonSecondary}`} onClick={(e) => { e.stopPropagation(); handleUnblockUser(u); }}>
                        Unblock
                      </div>
                    </div>
                  ))}
                  {blockedUsers.length === 0 && (
                    <div className={styles.infoText}>No blocked users</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'Messages':
        if (clawView === 'premium') {
          return (
            <div className={styles.premiumContainer}>
              <div className={styles.premiumScroll}>
                <div className={styles.premiumTitle}>Claw Premium</div>
                <div className={styles.premiumSubtitle}>What do you get?</div>

                <div className={styles.premiumFeatures}>
                  <div className={styles.premiumFeature}>✓ Post up to {limits?.content_length_premium || 600} characters</div>
                  <div className={styles.premiumFeature}>✓ Premium badge on your profile</div>
                  <div className={styles.premiumFeature}>✓ Support Claw development</div>
                </div>

                <div className={styles.premiumExampleContainer}>
                  <PostItem
                    post={{
                      id: 'example',
                      content: `When you buy claw premium you get the ability to send posts up to ${limits?.content_length_premium || 600} characters in length and a cool badge next to your name!`,
                      user: 'Mist',
                      timestamp: Date.now(),
                      os: 'Rotur Land',
                      premium: true,
                      likes: [],
                      replies: []
                    }}
                    currentUsername={username}
                    token={token}
                    onPostPress={() => { }}
                    onProfilePress={() => { }}
                    onLike={() => { }}
                    onRepost={() => { }}
                    onDelete={() => { }}
                    isReply={true}
                  />
                </div>

                <div
                  className={styles.premiumButton}
                  onClick={handlePremiumToggle}
                >
                  <span className={styles.premiumButtonText}>
                    {isPremium ? 'Unsubscribe' : 'Subscribe Now!'}
                  </span>
                </div>

                {!isPremium && (
                  <div className={styles.premiumPrice}>
                    Cost: 5 rotur credits a month, cancel anytime
                  </div>
                )}

                {isPremium && (
                  <div className={styles.premiumThanks}>
                    Thank you for supporting Claw! 💙
                  </div>
                )}

                <div
                  className={styles.premiumBackButton}
                  onClick={() => setClawView('feed')}
                >
                  <ArrowLeft size={20} color="#3b82f6" />
                  <span className={styles.premiumBackText}>Back to Feed</span>
                </div>
              </div>
            </div>
          );
        }

        if (selectedPost) {
          return (
            <div className={styles.feedContainer}>
              <div className={styles.postDetailHeader}>
                <div
                  className={styles.backButton}
                  onClick={() => {
                    setSelectedPost(null);
                  }}
                >
                  <ArrowLeft size={24} color="#9ca3af" />
                </div>
              </div>

              <div className={styles.feedScrollView}>
                <PostItem
                  post={selectedPost}
                  currentUsername={username}
                  token={token}
                  onPostPress={() => { }}
                  onProfilePress={handleProfilePress}
                  onLike={handleLikePost}
                  onRepost={handleRepost}
                  onDelete={handleDeletePost}
                />

                {/* Reply input */}
                <div className={styles.replyInputContainer}>
                  <textarea
                    className={styles.replyInput}
                    placeholder="Reply to this post..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    maxLength={maxPostLength}
                  />
                  <div className={styles.replyInputFooter}>
                    <span className={styles.charCount}>{replyContent.length}/{maxPostLength}</span>
                    <div
                      className={`${styles.postButton} ${(!replyContent.trim() || postingReply) ? styles.postButtonDisabled : ''}`}
                      onClick={handleReplyToPost}
                      style={{ pointerEvents: (!replyContent.trim() || postingReply) ? 'none' : 'auto' }}
                    >
                      {postingReply ? (
                        <div className={styles.spinner} style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                      ) : (
                        <Send size={18} color="#fff" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {selectedPost.replies && selectedPost.replies.length > 0 && (
                  <div key={selectedPost.id} className={styles.repliesContainer}>
                    <div className={styles.repliesHeader}>Replies</div>
                    {selectedPost.replies.map((reply: Reply) => (
                      <PostItem
                        key={reply.id}
                        post={reply as Post}
                        currentUsername={username}
                        token={token}
                        onPostPress={() => { }}
                        onProfilePress={handleProfilePress}
                        onLike={handleLikePost}
                        onRepost={handleRepost}
                        onDelete={handleDeletePost}
                        isReply={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Main feed view
        return (
          <div className={styles.feedContainer}>
            <div className={styles.feedMainContent}>
              <div className={styles.feedContentArea}>
                {!isWide && (
                  <ClawSidebar
                    currentView={clawView}
                    onViewChange={setClawView}
                    username={username}
                    onProfilePress={handleLoadProfile}
                    orientation="horizontal"
                    placement="inline"
                  />
                )}
                <div className={styles.feedHeaderText}>
                  {clawView === 'feed' && 'Claw Feed'}
                  {clawView === 'following' && 'Following'}
                  {clawView === 'top' && 'Top Posts'}
                  {isPremium && ' Premium'}
                </div>

                {/* New Post Input */}
                {clawView === 'feed' && (
                  <div className={styles.newPostContainer}>
                    <textarea
                      className={styles.newPostInput}
                      placeholder="What's happening?"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      maxLength={maxPostLength}
                    />
                    {attachment && (
                      <div onClick={() => setAttachment('')}>
                        <img
                          src={attachment}
                          alt="Attachment"
                          className={styles.attachmentPreview}
                        />
                      </div>
                    )}
                    <div className={styles.newPostFooter}>
                      <div className={styles.newPostActions}>
                        <div
                          className={styles.attachmentButton}
                          onClick={() => {
                            setError('Paste image URL in the post or use clipboard');
                            setTimeout(() => setError(''), 3000);
                          }}
                        >
                          <span className={styles.attachmentButtonText}>📎 Image</span>
                        </div>
                        <span className={styles.charCount}>{newPostContent.length}/{maxPostLength}</span>
                      </div>
                      <div
                        className={`${styles.postButton} ${(!newPostContent.trim() || postingContent) ? styles.postButtonDisabled : ''}`}
                        onClick={handlePostContent}
                        style={{ pointerEvents: (!newPostContent.trim() || postingContent) ? 'none' : 'auto' }}
                      >
                        {postingContent ? (
                          <div className={styles.spinner} style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                        ) : (
                          <Send size={18} color="#fff" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {error && <div className={styles.errorTextFeed}>{error}</div>}
                {success && <div className={styles.successTextFeed}>{success}</div>}

                {/* Feed */}
                {loadingPosts && posts.length === 0 ? (
                  <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                    <div className={styles.spinner}></div>
                  </div>
                ) : posts.length > 0 ? (
                  <div className={styles.feedScrollView}>
                    {[...posts].sort((a, b) => b.timestamp - a.timestamp).map(renderPost)}
                  </div>
                ) : (
                  <div className={styles.noPostsText}>No posts yet</div>
                )}
              </div>
            </div>
            {isWide && (
              <ClawSidebar
                currentView={clawView}
                onViewChange={setClawView}
                username={username}
                onProfilePress={handleLoadProfile}
                orientation="horizontal"
              />
            )}
          </div>
        );
      case 'Wallet': {
        const transactions = user?.["sys.transactions"] || [];

        const renderTransaction = (transaction: Transaction): ReactElement => {
          const type = transaction.type;
          const amount = transaction.amount;
          const user = transaction.user;
          const note = transaction.note;
          const time = transaction.time;

          const hash = `${user}-${amount}-${note}-${time}`;

          switch (type) {
            case 'gamble':
              return (
                <div key={hash} className={styles.postItem}>
                  <div className={styles.postUsername}>
                    <Dice6 size={16} color="#9ca3af" /> You {note} <span style={{ color: note.includes('won') ? '#4ade80' : '#ef4444' }}>{amount}</span> credits gambling
                  </div>
                  <div className={styles.postTimestamp}>
                    {formatTimestamp(time)}
                  </div>
                </div>
              );
            case 'out':
              return (
                <div key={hash} className={styles.postItem}>
                  <div className={styles.postUsername}>
                    <ArrowDownCircle size={16} color="#ef4444" /> You sent <span style={{ color: '#ef4444' }}>{amount}</span> credit to {user}
                  </div>
                  <div className={styles.postTimestamp}>
                    {formatTimestamp(time)}
                  </div>
                </div>
              );
            case 'in':
              return (
                <div key={hash} className={styles.postItem}>
                  <div className={styles.postUsername}>
                    <ArrowUpCircle size={16} color="#4ade80" /> {user} sent you <span style={{ color: '#4ade80' }}>{amount}</span> credits
                  </div>
                  <div className={styles.postTimestamp}>
                    {formatTimestamp(time)}
                  </div>
                </div>
              );
            case 'tax':
              return (
                <div key={hash} className={styles.postItem}>
                  <div className={styles.postUsername}>
                    <Landmark size={16} color="#9ca3af" /> You got <span style={{ color: '#4ade80' }}>{amount}</span> from {user}'s taxes
                  </div>
                  <div className={styles.postTimestamp}>
                    {formatTimestamp(time)}
                  </div>
                </div>
              );
            case 'escrow_out': {
              const petition_id = transaction?.petition_id || 0;
              return (
                <div key={hash} className={styles.postItem}>
                  <div className={styles.postUsername}>
                    <Handshake size={16} color="#9ca3af" /> You sent <span style={{ color: '#ef4444' }}>{amount}</span> to devfund petition #{petition_id}
                  </div>
                  <div className={styles.postTimestamp}>
                    {formatTimestamp(time)}
                  </div>
                </div>
              );
            }
            default:
              return <div key={hash} className={styles.postItem} />;
          }
        };

        const creditSeries = transactions
          .filter((t: any) => typeof t.new_total === 'number')
          .map((t: any) => ({ t: t.time, v: t.new_total }))
          .sort((a: any, b: any) => a.t - b.t);

        const renderCreditsGraph = (): ReactElement | null => {
          if (creditSeries.length < 2) return null;
          const w = 600;
          const h = 120;
          const minV = Math.min(...creditSeries.map(p => p.v));
          const maxV = Math.max(...creditSeries.map(p => p.v));
          const range = maxV - minV || 1;
          const minT = creditSeries[0].t;
          const maxT = creditSeries[creditSeries.length - 1].t;
          const tRange = maxT - minT || 1;
          const pad = 8;
          const pts = creditSeries.map(p => {
            const x = pad + ((p.t - minT) / tRange) * (w - pad * 2);
            const y = pad + (1 - (p.v - minV) / range) * (h - pad * 2);
            return `${x},${y}`;
          }).join(' ');
          return (
            <div className={styles.walletGraph}>
              <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
                <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2" />
              </svg>
            </div>
          );
        };

        return (
          <div className={styles.walletContainer}>
            <div className={styles.walletHeader}>Wallet</div>
            <div className={styles.walletBalance}>
              <div className={styles.walletBalanceText}>
                <Coins size={24} color="#9ca3af" /> {user?.["sys.currency"] || 0} credits
              </div>
            </div>
            {renderCreditsGraph()}
            <div className={styles.feedScrollView}>
              {transactions.length > 0 ? (
                transactions.map((transaction: any) => renderTransaction(transaction))
              ) : (
                <div className={styles.noPostsText}>No transactions yet</div>
              )}
            </div>
            <div
              className={styles.postButton}
              onClick={() => setPage('Transfer')}
              style={{ position: 'fixed', bottom: '80px', right: '20px' }}
            >
              <Send size={18} color="#fff" />
              <span className={styles.buttonText}>Send</span>
            </div>
          </div>
        );
      }
      case 'Notifications':
        return (
          <div className={styles.viewContent} style={{ paddingBottom: '60px' }}>
            <div className={styles.headerText}>Notifications</div>
            {loadingNotifications && (
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <div className={styles.spinner}></div>
              </div>
            )}
            {!loadingNotifications && notifications.length === 0 && (
              <div className={styles.noPostsText}>No notifications</div>
            )}
            {!loadingNotifications && notifications.length > 0 && (
              <div className={styles.feedScrollView}>
                {notifications.map((n: any, idx: number) => renderNotificationItem(n, idx))}
              </div>
            )}
          </div>
        );
      default:
        return <div className={styles.viewContent} />;
    }
  };

  const { isWide } = useViewport();

  if (isWide) {
    return (
      <div className={`${styles.mainContainer} ${styles.desktopLayout}`}>
        <Sidebar activeTab={activeTab} onChange={changeTab} />
        <div className={styles.desktopContent}>{renderContent()}</div>
        {imageOverlay !== '' && (
          <div className={styles.imageOverlay} onClick={() => setImageOverlay('')}>
            <img src={imageOverlay} alt="Overlay" className={styles.imageOverlayContent} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.mainContainer}>
      <div className={styles.contentContainer}>{renderContent()}</div>
      <TabBar activeTab={activeTab} setActiveTab={changeTab} />
      {imageOverlay !== '' && (
        <div className={styles.imageOverlay} onClick={() => setImageOverlay('')}>
          <img src={imageOverlay} alt="Overlay" className={styles.imageOverlayContent} />
        </div>
      )}
    </div>
  )
};
