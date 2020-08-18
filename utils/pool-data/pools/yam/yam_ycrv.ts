import { ethers } from 'ethers'
import {
  ERC20_ABI,
  YAM_TOKEN_ABI,
  YAM_TOKEN_ADDR,
  YAM_YCRV_UNI_TOKEN_ADDR,
  YCRV_TOKEN_ADDR,
  YFFI_REWARD_CONTRACT_ABI,
} from '../../../constants'
import { priceLookupService } from '../../../price-lookup-service'
import { get_synth_weekly_rewards, toDollar, toFixed } from '../../../utils'

export default async function main(App) {
  const stakingTokenAddr = YAM_YCRV_UNI_TOKEN_ADDR
  const stakingTokenTicker = 'UNIV2'
  const rewardPoolAddr = '0xADDBCd6A68BFeb6E312e82B30cE1EB4a54497F4c'
  const rewardTokenAddr = YAM_TOKEN_ADDR
  const balancerPoolTokenAddr = '0xc7062D899dd24b10BfeD5AdaAb21231a1e7708fE'
  const rewardTokenTicker = 'YAM'

  const REWARD_POOL = new ethers.Contract(
    rewardPoolAddr,
    YFFI_REWARD_CONTRACT_ABI,
    App.provider
  )

  const STAKING_TOKEN = new ethers.Contract(
    stakingTokenAddr,
    ERC20_ABI,
    App.provider
  )

  const Y_TOKEN = new ethers.Contract(YCRV_TOKEN_ADDR, ERC20_ABI, App.provider)

  const YAM_TOKEN = new ethers.Contract(
    YAM_TOKEN_ADDR,
    YAM_TOKEN_ABI,
    App.provider
  )

  const yamScale = (await YAM_TOKEN.yamsScalingFactor()) / 1e18

  const totalYCRVInUniswapPair =
    (await Y_TOKEN.balanceOf(YAM_YCRV_UNI_TOKEN_ADDR)) / 1e18
  const totalYAMInUniswapPair =
    (await YAM_TOKEN.balanceOf(YAM_YCRV_UNI_TOKEN_ADDR)) / 1e18

  const stakedYAmount = (await REWARD_POOL.balanceOf(App.YOUR_ADDRESS)) / 1e18
  const earnedYFFI =
    (yamScale * (await REWARD_POOL.earned(App.YOUR_ADDRESS))) / 1e18
  const totalSupplyOfStakingToken = (await STAKING_TOKEN.totalSupply()) / 1e18
  const totalStakedYAmount =
    (await STAKING_TOKEN.balanceOf(rewardPoolAddr)) / 1e18

  const weekly_reward =
    ((await get_synth_weekly_rewards(REWARD_POOL)) *
      (await YAM_TOKEN.yamsScalingFactor())) /
    1e18

  const rewardPerToken = weekly_reward / totalStakedYAmount

  const {
    yam: rewardTokenPrice,
    'curve-fi-ydai-yusdc-yusdt-ytusd': YVirtualPrice,
  } = await priceLookupService.getPrices([
    'yam',
    'curve-fi-ydai-yusdc-yusdt-ytusd',
  ])
  const stakingTokenPrice =
    (totalYAMInUniswapPair * rewardTokenPrice +
      totalYCRVInUniswapPair * YVirtualPrice) /
    totalSupplyOfStakingToken

  const YFIWeeklyROI =
    (rewardPerToken * rewardTokenPrice * 100) / stakingTokenPrice

  return {
    provider: 'yam.finance',
    name: 'YAM/yCRV',
    poolRewards: ['YAM'],
    apr: toFixed(YFIWeeklyROI * 52, 4),
    prices: [
      { label: 'YAM', value: toDollar(rewardTokenPrice) },
      { label: stakingTokenTicker, value: toDollar(stakingTokenPrice) },
    ],
    staking: [
      {
        label: 'Pool Total',
        value: toDollar(totalStakedYAmount * stakingTokenPrice),
      },
      {
        label: 'Your Total',
        value: toDollar(stakedYAmount * stakingTokenPrice),
      },
    ],
    rewards: [
      {
        label: `${toFixed(earnedYFFI, 4)} YAM`,
        value: toDollar(earnedYFFI * rewardTokenPrice),
      },
    ],
    ROIs: [
      {
        label: 'Hourly',
        value: `${toFixed(YFIWeeklyROI / 7 / 24, 4)}%`,
      },
      {
        label: 'Daily',
        value: `${toFixed(YFIWeeklyROI / 7, 4)}%`,
      },
      {
        label: 'Weekly',
        value: `${toFixed(YFIWeeklyROI, 4)}%`,
      },
    ],
    links: [
      {
        title: 'Info',
        link: 'https://medium.com/@yamfinance/yam-finance-d0ad577250c7',
      },
      {
        title: 'Pool',
        link:
          'https://uniswap.info/pair/0x2c7a51a357d5739c5c74bf3c96816849d2c9f726',
      },
      {
        title: 'Staking',
        link: 'https://yam.finance/',
      },
    ],
  }
}