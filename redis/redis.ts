import Redis from 'ioredis';

class RedisManager {
    private static instance: RedisManager;
    private redisClient: Redis;

    private constructor() {
        this.redisClient = new Redis();
    }

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    public getClient(): Redis {
        return this.redisClient;
    }
}

export default RedisManager;