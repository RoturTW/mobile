import { FC, useState } from 'react';
import { Heart, MessageCircle, Repeat2, Trash2 } from 'lucide-react';
import styles from '../styles.module.css';
import { Post } from '../interfaces';
import utils from '../utils';

const formatTimestamp = utils.formatTimestamp;

interface PostItemProps {
  post: Post;
  currentUsername: string;
  token: string;
  onPostPress: (post: Post) => void;
  onProfilePress: (username: string) => void;
  onLike: (postId: string, isLiked: boolean) => void;
  onRepost: (postId: string) => void;
  onDelete: (postId: string) => void;
  isReply?: boolean;
}

const PostItem: FC<PostItemProps> = ({ 
  post, 
  currentUsername, 
  onPostPress, 
  onProfilePress,
  onLike,
  onRepost,
  onDelete,
  isReply = false
}) => {
  const isRepost = post.original_post !== undefined;
  const displayPost = isRepost ? post.original_post || post : post
  const reposter = isRepost ? post.user : null;
  
  const isLiked = displayPost.likes?.includes(currentUsername.toLowerCase()) || false;
  const likeCount = displayPost.likes?.length || 0;
  const replyCount = displayPost.replies?.length || 0;
  const isMyPost = displayPost.user.toLowerCase() === currentUsername.toLowerCase();

  const [imageError, setImageError] = useState(false);

  return (
    <div 
      className={styles.postItem} 
      onClick={() => !isReply && onPostPress(displayPost)}
      style={{ cursor: isReply ? 'default' : 'pointer' }}
    >
      {isRepost && (
        <div className={styles.repostHeader}>
          <Repeat2 size={14} color="#9ca3af" />
          <span className={styles.repostText}>Reposted by {reposter}</span>
        </div>
      )}
      
      <div className={styles.postHeader}>
        <div onClick={(e) => { e.stopPropagation(); onProfilePress(displayPost.user); }}>
          <img
            src={`https://avatars.rotur.dev/${displayPost.user}`}
            alt={displayPost.user}
            className={styles.postAvatar}
          />
        </div>
        <div className={styles.postUserInfo}>
          <div onClick={(e) => { e.stopPropagation(); onProfilePress(displayPost.user); }}>
            <div className={styles.usernameRow}>
              <span className={styles.postUsername}>{displayPost.user}</span>
              {displayPost.premium && (
                <div className={styles.premiumBadge}>
                  <span className={styles.premiumBadgeText}>✓</span>
                </div>
              )}
            </div>
          </div>
          <div className={styles.postMetadata}>
            {!isReply && `Posted from ${displayPost.os || 'Unknown'} · `}
            {formatTimestamp(displayPost.timestamp)}
          </div>
        </div>
      </div>
      
      <div className={styles.postContent}>{displayPost.content}</div>
      
      {displayPost.attachment && !imageError && (
        <div>
          <img
            src={displayPost.attachment}
            alt="Attachment"
            className={styles.postAttachment}
            onError={() => setImageError(true)}
          />
        </div>
      )}
      
      {!isReply && (
        <div className={styles.postActions}>
          <div 
            className={styles.postAction}
            onClick={(e) => { e.stopPropagation(); onLike(displayPost.id, isLiked); }}
          >
            <Heart 
              size={18} 
              color={isLiked ? '#ef4444' : '#9ca3af'} 
              fill={isLiked ? '#ef4444' : 'none'} 
            />
            {likeCount > 0 && <span className={styles.postActionText}>{likeCount}</span>}
          </div>
          
          <div className={styles.postAction}>
            <MessageCircle size={18} color="#9ca3af" />
            {replyCount > 0 && <span className={styles.postActionText}>{replyCount}</span>}
          </div>
          
          {!isMyPost && !displayPost.profile_only && !isRepost && (
            <div 
              className={styles.postAction}
              onClick={(e) => { e.stopPropagation(); onRepost(displayPost.id); }}
            >
              <Repeat2 size={18} color="#9ca3af" />
            </div>
          )}
          
          {isMyPost && (
            <div 
              className={`${styles.postAction} ${styles.deleteAction}`}
              onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
            >
              <Trash2 size={18} color="#ef4444" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostItem;

