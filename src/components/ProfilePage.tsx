import React, { FC, useEffect, useState, useRef } from 'react';
import { ArrowLeft, UserPlus, UserCheck, Heart, Calendar, Users, MapPin, Coins, Handshake } from 'lucide-react';
import styles from './ProfilePage.module.css';
import appStyles from '../styles.module.css';
import rotur from '../rotur';
import { Post } from '../interfaces';
import PostItem from './PostItem';

interface Badge {
  name: string;
  icon: string;
  description: string;
}

interface Theme {
  accent?: string;
  background?: string;
  primary?: string;
  secondary?: string;
  selected_col?: string;
  show_outline?: boolean;
  tertiary?: string;
  text?: string;
}

const BadgeCanvas: FC<{ badge: Badge }> = ({ badge }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 40;
    canvas.height = 40;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(20, 20);
    ctx.scale(1.5, 1.5);

    const commands = badge.icon.split(' ');
    let currentColor = '#fff';
    let lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];

      if (cmd === 'w') {
        lineWidth = parseFloat(commands[++i]);
        ctx.lineWidth = lineWidth;
      } else if (cmd === 'c') {
        currentColor = commands[++i];
        ctx.strokeStyle = currentColor;
        ctx.fillStyle = currentColor;
      } else if (cmd === 'square') {
        const x = parseFloat(commands[++i]);
        const y = -parseFloat(commands[++i]);
        const w = parseFloat(commands[++i]);
        const h = parseFloat(commands[++i]);
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
      } else if (cmd === 'dot') {
        const x = parseFloat(commands[++i]);
        const y = -parseFloat(commands[++i]);
        ctx.beginPath();
        ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (cmd === 'line') {
        const x1 = parseFloat(commands[++i]);
        const y1 = -parseFloat(commands[++i]);
        const x2 = parseFloat(commands[++i]);
        const y2 = -parseFloat(commands[++i]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (cmd === 'cont') {
        const x = parseFloat(commands[++i]);
        const y = -parseFloat(commands[++i]);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (cmd === 'cutcircle') {
        const x = parseFloat(commands[++i]);
        const y = -parseFloat(commands[++i]);
        const r = parseFloat(commands[++i]);
        const direction = parseFloat(commands[++i]);
        const arclength = parseFloat(commands[++i]);

        const dirRad = (direction - 45) * Math.PI / 18;
        const arcRad = arclength * Math.PI / 90;
        const startAngle = dirRad - arcRad / 2;
        const endAngle = dirRad + arcRad / 2;

        ctx.beginPath();
        ctx.arc(x, y, r, startAngle, endAngle);
        ctx.stroke();
      } else if (cmd === 'ellipse') {
        const x = parseFloat(commands[++i]);
        const y = -parseFloat(commands[++i]);
        const r = parseFloat(commands[++i]);
        const rx = parseFloat(commands[++i]) * r;
        const rotation = parseFloat(commands[++i]);
        ctx.beginPath();
        ctx.ellipse(x, y, rx, r, rotation * Math.PI / 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [badge.icon]);

  return <canvas ref={canvasRef} className={styles.badgeCanvas} title={badge.description} />;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any): void {
    console.error('Render error:', error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorText}>Something went wrong</div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ProfilePageData {
  username: string;
  bio?: string;
  badges?: Badge[];
  banner?: string;
  created?: number;
  currency?: number;
  followers?: number;
  following?: number;
  married_to?: string;
  pfp?: string;
  private?: boolean;
  pronouns?: string;
  status?: string | null;
  subscription?: string;
  system?: string;
  theme?: Theme;
  posts?: Post[];
  followed?: boolean;
  max_size?: string;
  index?: number;
}

interface ProfilePageProps {
  username: string;
  currentUsername: string;
  token: string;
  onBack: () => void;
  onProfilePress: (username: string) => void;
  onPostPress: (post: Post) => void;
  onLike: (postId: string, isLiked: boolean) => void;
  onRepost: (postId: string) => void;
  onDelete: (postId: string) => void;
  isFriend?: boolean;
}

const ProfilePage: FC<ProfilePageProps> = ({
  username,
  currentUsername,
  token,
  onBack,
  onProfilePress,
  onPostPress,
  onLike,
  onRepost,
  onDelete,
  isFriend = false
}) => {
  const [profile, setProfile] = useState<ProfilePageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [hasBanner, setHasBanner] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<'recent' | 'likes' | 'replies'>('recent');
  const [sendingRequest, setSendingRequest] = useState<boolean>(false);
  const [requestMessage, setRequestMessage] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const profileResponse = await fetch(`https://api.rotur.dev/profile?auth=${token}&name=${username}`);
        const profileData = await profileResponse.json();

        const fullProfile: ProfilePageData = {
          ...profileData,
          username: username
        };

        setProfile(fullProfile);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, token]);

  useEffect(() => {
    if (!profile?.banner) {
      setHasBanner(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setHasBanner(!(w <= 3 && h <= 1));
    };
    img.onerror = () => setHasBanner(false);
    img.src = profile.banner;
  }, [profile?.banner]);

  const handleFollowToggle = async () => {
    if (!profile) return;

    try {
      const action = profile.followed ? 'unfollow' : 'follow';
      const resp = await fetch(`https://api.rotur.dev/${action}?auth=${token}&username=${username}`);
      const json = await resp.json();
      if (json.error) {
        console.error('Follow toggle error:', json.error);
        setError(json.error);
        return;
      }
      setProfile({
        ...profile,
        followed: !profile.followed,
        followers: (profile.followers || 0) + (profile.followed ? -1 : 1)
      });
    } catch (err) {
      console.error('Follow toggle error:', err);
      setError('Failed to follow/unfollow');
    }
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={24} color="#9ca3af" />
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={24} color="#9ca3af" />
        </div>
        <div className={styles.errorContainer}>
          <div className={styles.errorText}>{error || 'Profile not found'}</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = profile.username.toLowerCase() === currentUsername.toLowerCase();

  return (
    <ErrorBoundary>
    <div
      className={styles.container}
      style={{ backgroundColor: profile.theme?.background || undefined }}
    >
      <div className={styles.backButton} onClick={onBack}>
        <ArrowLeft size={24} color="#9ca3af" />
      </div>

      <div className={styles.content}>
        {/* Banner */}
        {hasBanner && (
          <div
            className={styles.banner}
            style={{
              backgroundImage: `url(${profile.banner})`,
              backgroundColor: profile.theme?.primary || undefined
            }}
          />
        )}

        {/* Profile Header */}
        <div className={styles.profileHeader} style={{ marginTop: hasBanner ? -50 : 0 }}>
          <div className={styles.avatarContainer}>
            <img
              src={profile.pfp || `https://avatars.rotur.dev/${profile.username}`}
              alt={profile.username}
              className={styles.avatar}
            />
          </div>

          <div className={styles.headerInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.username}>{profile.username}</h1>
              {profile.subscription && profile.subscription !== 'None' && (
                <div className={styles.subscriptionBadge}>{profile.subscription}</div>
              )}
            </div>

            {profile.pronouns && (
              <div className={styles.pronouns}>{profile.pronouns}</div>
            )}

            {profile.married_to && (
              <div className={styles.marriedTo}>
                <Heart size={14} color="#f87171" />
                <span>Married to {profile.married_to}</span>
              </div>
            )}

            <div style={{flex: 1, display: 'flex', justifyContent: 'flex-start', gap: 10}}>
              {!isOwnProfile && (
                <div
                  className={`${styles.followButton} ${profile.followed ? styles.followingButton : ''}`}
                  onClick={handleFollowToggle}
                  style={{
                    backgroundColor: profile.followed ? undefined : "#3b82f6"
                  }}
                >
                  {profile.followed ? (
                    <>
                      <UserCheck size={16} color="#fff" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} color="#fff" />
                      <span>Follow</span>
                    </>
                  )}
                </div>
              )}
              {!isOwnProfile && !isFriend && (
                <div
                  className={styles.followButton}
                  onClick={async () => {
                    if (!profile || sendingRequest) return;
                    try {
                      setError('');
                      setRequestMessage('');
                      setSendingRequest(true);
                      const msg = await rotur.sendFriendRequest(token, profile.username);
                      setRequestMessage(msg);
                    } catch (err: any) {
                      setError(err?.message || 'Failed to send friend request');
                    } finally {
                      setSendingRequest(false);
                    }
                  }}
                  style={{
                    backgroundColor: "#3b82f6"
                  }}
                >
                  {sendingRequest ? (
                    <span className={appStyles.buttonText}>Sending...</span>
                  ) : (
                    <span className={appStyles.buttonText}><Handshake size={16} color="#fff" /> Send Friend Request</span>
                  )}
                </div>
              )}
              {requestMessage && (
                <div className={appStyles.successText} style={{ marginTop: 8 }}>{requestMessage}</div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className={styles.bioSection}>
            <p className={styles.bio}>{profile.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div className={styles.statsSection}>
          {profile.system && (
            <div className={styles.statItem}>
              <MapPin size={16} color="#9ca3af" />
              <span>{profile.system}</span>
            </div>
          )}
          {profile.created && (
            <div className={styles.statItem}>
              <Calendar size={16} color="#9ca3af" />
              <span>Joined {formatDate(profile.created)}</span>
            </div>
          )}
          {typeof profile.currency === 'number' && (
            <div className={styles.statItem}>
              <Coins size={16} color="#9ca3af" />
              <span><strong>{profile.currency}</strong> credits</span>
            </div>
          )}
          <div className={styles.statItem}>
            <Users size={16} color="#9ca3af" />
            <span>
              <strong>{profile.followers || 0}</strong> followers · <strong>{profile.following || 0}</strong> following
            </span>
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className={styles.badgesSection}>
            <h2 className={styles.sectionTitle}>Badges</h2>
            <div className={styles.badgesGrid}>
              {profile.badges.map((badge, index) => (
                <div key={index} className={styles.badgeItem}>
                  <BadgeCanvas badge={badge} />
                  <div className={styles.badgeInfo}>
                    <div className={styles.badgeName}>{badge.name}</div>
                    <div className={styles.badgeDescription}>{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        {profile.status && (
          <div className={styles.statusSection}>
            <div className={styles.statusLabel}>Status</div>
            <div className={styles.statusText}>{profile.status}</div>
          </div>
        )}

        {/* Posts */}
        {profile.private && !isOwnProfile && !profile.followed ? (
          <div className={styles.privateNoticeSection}>
            <div className={styles.privateNoticeTitle}>This profile is private</div>
            <div className={styles.privateNoticeText}>Follow {profile.username} to see their posts.</div>
          </div>
        ) : profile.posts && profile.posts.length > 0 ? (
          <div className={styles.postsSection}>
            <h2 className={styles.sectionTitle}>Posts</h2>
            <div className={styles.sortRow}>
              <label className={styles.sortLabel} htmlFor="sortMode">Sort</label>
              <select
                id="sortMode"
                className={styles.sortSelect}
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as 'recent' | 'likes' | 'replies')}
              >
                <option value="recent">Recent</option>
                <option value="likes">Most Likes</option>
                <option value="replies">Most Replies</option>
              </select>
            </div>
            <div className={styles.postsList}>
              {(() => {
                const sorted = [...profile.posts];
                if (sortMode === 'recent') {
                  sorted.sort((a, b) => b.timestamp - a.timestamp);
                } else if (sortMode === 'likes') {
                  sorted.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0) || b.timestamp - a.timestamp);
                } else if (sortMode === 'replies') {
                  sorted.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0) || b.timestamp - a.timestamp);
                }
                return sorted.map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    currentUsername={currentUsername}
                    token={token}
                    onPostPress={onPostPress}
                    onProfilePress={onProfilePress}
                    onLike={onLike}
                    onRepost={onRepost}
                    onDelete={onDelete}
                  />
                ));
              })()}
            </div>
          </div>
        ) : (
          <div className={styles.postsSection}>
            <h2 className={styles.sectionTitle}>Posts</h2>
            <div className={styles.infoText}>No posts yet</div>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default ProfilePage;
