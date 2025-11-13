import { useState } from 'react';

let clawWs: WebSocket | null = null;
let reconnectAttempts = 0;
let pingInterval: number | null = null;

import { Post } from './interfaces';

const allPosts: { [key: string]: any } = {};
const users: { [key: string]: any } = {};
let auth: string | null = null;

let reconnectTimeout: number | null = null;

function setAuth(token: string): void {
    auth = token;
}

const [posts, setPosts] = useState<Post[]>([]);

async function getUser(username: string): Promise<any> {
    const data = users[username];
    if (!data) {
        await fetch(`https://api.rotur.dev/profile?auth=${auth}&name=${username}`)
            .then(response => response.json())
            .then(json => {
                users[username] = json;
            });
        return users[username];
    }
    return data;
}

function connect(): void {
    if (clawWs && clawWs.readyState === WebSocket.OPEN) {
        clawWs.close();
    }
    if (pingInterval !== null) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    clawWs = new WebSocket('wss://socialws.rotur.dev');

    clawWs.onopen = function () {
        console.log('Connected to Claw!');
        if (reconnectTimeout !== null) {
            clearTimeout(reconnectTimeout);
        }
        reconnectAttempts = 0;
        pingInterval = window.setInterval(() => {
            if (clawWs && clawWs.readyState === WebSocket.OPEN) {
                clawWs.send(JSON.stringify({ cmd: 'ping' }));
            }
        }, 30000);
    };

    clawWs.onmessage = function (event) {
        const data = JSON.parse(event.data);
        console.log('Claw message received:', data);

        switch (data.cmd) {
            case 'ping':
            case 'handshake':
                break;
            case 'posts': {
                const val = data.val;
                setPosts(val);
                for (let i = 0; i < val.length; i++) {
                    const post = val[i];
                    allPosts[post.id] = post;
                }
                break;
            }
            case 'new_post': {
                const id = data.val.id;
                setPosts(prevPosts => [...prevPosts, data.val]);
                allPosts[id] = data.val;
                break;
            }
            case 'update_post': {
                const id = data.val.id;
                const key = String(data.val.key);
                const post = allPosts[id];
                post[key] = data.val.data;
                setPosts(prevPosts => prevPosts.map(p => p.id === id ? post : p));
                break;
            }
            case 'delete_post': {
                const id = data.val.id;
                delete allPosts[id];
                setPosts(prevPosts => prevPosts.filter(p => p.id !== id));
                break;
            }
            case 'followers': {
                const username = data.val.username;
                if (users[username]) {
                    users[username].followers = data.val.followers;
                }
                break;
            }
            default:
                console.error('Unknown Claw message:', data);
        }
    };

    clawWs.onerror = function () {
        console.log('Claw connection error');
    };

    clawWs.onclose = function () {
        console.log('Claw connection closed');
        if (pingInterval !== null) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
        const jitter = Math.floor(Math.random() * 1000);
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts)) + jitter;
        reconnectAttempts++;
        reconnectTimeout = setTimeout(() => {
            connect();
        }, delay);
    };
}

export default {
    posts,
    setPosts,
    allPosts,
    connect,
    setAuth,
    getUser,
};

