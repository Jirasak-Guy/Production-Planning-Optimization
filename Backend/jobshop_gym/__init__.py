from gymnasium.envs.registration import register

register(
    id="jobshop_gym/JobShop-v1",
    entry_point="jobshop_gym.envs:JobShopEnv",
    #max_episode_steps=300, 
)