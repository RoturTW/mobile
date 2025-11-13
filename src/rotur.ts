interface RoturClient {
  ip?: string;
  username?: string;
  users?: string[];
  room?: string;
}

interface RoturMessage {
  cmd: string;
  val: any;
  listener?: string;
  id?: string;
}

interface Packet {
  cmd?: string;
  origin: string;
  client: object;
  source: string;
  payload: any;
  target: string;
  timestamp: number;
  val?: any;
}

const username: string = "test";
const designation: string = "rtr";

const my_client = {
  system: "rotur.js",
  version: "v2"
};

const packets: { [key: string]: Packet[] } = {};

function sendHandshake(): void {
  const msg: RoturMessage = {
    cmd: "handshake",
    val: {
      language: "Javascript",
      version: {
        editorType: "rotur",
        versionNumber: null
      }
    },
    listener: "handshake_cfg"
  };

  ws.send(JSON.stringify(msg));
}

function setUsername(name: string): void {
  const msg: RoturMessage = {
    cmd: "setid",
    val: name,
    listener: "set_username_cfg"
  };

  ws.send(JSON.stringify(msg));
}

function linkRoom(room: string[]): void {
  const msg: RoturMessage = {
    cmd: "link",
    val: room,
    listener: "link_cfg"
  };

  ws.send(JSON.stringify(msg));
}

function replyToPacket(message: Packet, payload: any): void {
  const msg: RoturMessage = {
    cmd: "pmsg",
    val: {
      client: my_client,
      target: message.source,
      message: payload,
      timestamp: Date.now()
    },
    id: message.origin
  };

  ws.send(JSON.stringify(msg));
}

function sendMessage(payload: any, name: string, target: string, source: string): void {
  const msg: RoturMessage = {
    cmd: "pmsg",
    val: {
      client: my_client,
      target: target,
      payload: payload,
      source: source,
      timestamp: Date.now()
    },
    id: name
  };

  ws.send(JSON.stringify(msg));
}

async function fetchUserData(token: string): Promise<any> {
  try {
    const response = await fetch(`https://api.rotur.dev/me?auth=${token}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
  return null;
}

async function sendFriendRequest(token: string, username: string): Promise<string> {
  const response = await fetch(`https://api.rotur.dev/friends/request/${username}?auth=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.message;
}

async function updateUser(token: string, key: string, value: any): Promise<any> {
  try {
    const response = await fetch('https://api.rotur.dev/me/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth: token, key, value })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to update user field');
    }
    return data;
  } catch (err) {
    console.error('Error updating user field:', err);
    throw err;
  }
}

async function getBlocking(token: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.rotur.dev/me/blocked?auth=${token}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to get blocked users');
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching blocked users:', err);
    return [];
  }
}

async function blockUser(token: string, username: string): Promise<any> {
  const response = await fetch(`https://api.rotur.dev/me/block/${encodeURIComponent(username)}?auth=${token}`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to block user');
  }
  return data;
}

async function unblockUser(token: string, username: string): Promise<any> {
  const response = await fetch(`https://api.rotur.dev/me/unblock/${encodeURIComponent(username)}?auth=${token}`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to unblock user');
  }
  return data;
}

async function acceptFriendRequest(token: string, username: string): Promise<any> {
  const response = await fetch(`https://api.rotur.dev/friends/accept/${encodeURIComponent(username)}?auth=${token}`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to accept friend request');
  }
  return data;
}

async function rejectFriendRequest(token: string, username: string): Promise<any> {
  const response = await fetch(`https://api.rotur.dev/friends/reject/${encodeURIComponent(username)}?auth=${token}`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to reject friend request');
  }
  return data;
}

async function removeFriend(token: string, username: string): Promise<any> {
  const response = await fetch(`https://api.rotur.dev/friends/remove/${encodeURIComponent(username)}?auth=${token}`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to remove friend');
  }
  return data;
}

async function getFriends(token: string): Promise<{ friends: string[]; requests: string[] }> {
  try {
    const response = await fetch(`https://api.rotur.dev/friends?auth=${token}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to get friends');
    }
    return {
      friends: Array.isArray(data?.friends) ? data.friends : [],
      requests: Array.isArray(data?.requests) ? data.requests : []
    };
  } catch (err) {
    console.error('Error fetching friends:', err);
    return { friends: [], requests: [] };
  }
}

async function updateStatus(token: string, params: { content?: string; activity_name?: string; activity_desc?: string; activity_image?: string }): Promise<any> {
  const qs = new URLSearchParams();
  qs.set('auth', token);
  if (params.content) qs.set('content', params.content);
  if (params.activity_name) qs.set('activity_name', params.activity_name);
  if (params.activity_desc) qs.set('activity_desc', params.activity_desc);
  if (params.activity_image) qs.set('activity_image', params.activity_image);
  const response = await fetch(`https://api.rotur.dev/status/update?${qs.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to update status');
  }
  return data;
}

async function clearStatus(token: string): Promise<any> {
  const response = await fetch(`https://api.rotur.dev/status/clear?auth=${token}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to clear status');
  }
  return data;
}

async function getMarriageStatus(token: string): Promise<any> {
  try {
    const response = await fetch(`https://api.rotur.dev/marriage/status?auth=${token}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error fetching marriage status:', error);
    return null;
  }
}

async function proposeMarriage(token: string, username: string): Promise<any> {
  try {
    const response = await fetch(`https://api.rotur.dev/marriage/propose/${username}?auth=${token}`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to propose marriage');
    }
    return data;
  } catch (err) {
    console.error('Error proposing marriage:', err);
    throw err;
  }
}

async function acceptMarriage(token: string): Promise<any> {
  try {
    const response = await fetch(`https://api.rotur.dev/marriage/accept?auth=${token}`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to accept marriage');
    }
    return data;
  } catch (err) {
    console.error('Error accepting marriage:', err);
    throw err;
  }
}

async function rejectMarriage(token: string): Promise<any> {
  try {
    const response = await fetch(`https://api.rotur.dev/marriage/reject?auth=${token}`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to reject marriage');
    }
    return data;
  } catch (err) {
    console.error('Error rejecting marriage:', err);
    throw err;
  }
}

async function cancelMarriage(token: string): Promise<any> {
  try {
    const response = await fetch(`https://api.rotur.dev/marriage/cancel?auth=${token}`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to cancel marriage');
    }
    return data;
  } catch (err) {
    console.error('Error canceling marriage:', err);
    throw err;
  }
}

async function divorceMarriage(token: string): Promise<any> {
  try {
    const response = await fetch(`https://api.rotur.dev/marriage/divorce?auth=${token}`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to divorce');
    }
    return data;
  } catch (err) {
    console.error('Error divorcing:', err);
    throw err;
  }
}

const ws = new WebSocket("wss://rotur.mistium.com");
const client: RoturClient = {};

ws.onopen = function () {
  console.log("Connected!");
  sendHandshake();

  ws.onmessage = function (event) {
    const packet = JSON.parse(event.data);
    
    if (packet.cmd === "client_ip") {
      client.ip = packet.val;
    } else if (packet.cmd === "client_obj") {
      client.username = packet.val.username;
    } else if (packet.cmd === "ulist") {
      if (packet.mode === "add") {
        client.users = client.users || [];
        client.users.push(packet.val);
      } else if (packet.mode === "remove") {
        client.users = (client.users || []).filter(user => user !== packet.val);
      } else if (packet.mode === "set") {
        client.users = packet.val;
      }
    }
    
    if (packet.cmd === "pmsg") {
      packet.origin = packet.origin.username;
      delete packet.rooms;
      delete packet.cmd;
      packet.client = packet.val.client;
      packet.source = packet.val.source;
      packet.payload = packet.val.payload;
      if (!packets[packet.target]) {
        packets[packet.val.target] = [];
      }
      packets[packet.val.target].push(packet);
      delete packet.val;
    }
    
    if (packet.listener === "handshake_cfg") {
      setUsername(designation + "-" + username);
    }
    if (packet.listener === "set_username_cfg") {
      client.username = designation + "-" + username;
      linkRoom(["roturTW"]);
    }
    if (packet.listener === "link_cfg") {
      client.room = packet.val;
    }
  };
};

ws.onclose = function () {
  console.log("Connection is closed...");
};

export default {
  sendMessage,
  sendHandshake,
  setUsername,
  linkRoom,
  replyToPacket,
  sendFriendRequest,
  fetchUserData,
  client,
  packets,
  ws,
  updateUser,
  getBlocking,
  blockUser,
  unblockUser,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  updateStatus,
  clearStatus,
  getMarriageStatus,
  proposeMarriage,
  acceptMarriage,
  rejectMarriage,
  cancelMarriage,
  divorceMarriage
};

