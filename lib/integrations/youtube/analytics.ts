/**
 * YouTube Channel Analytics
 * Fetches performance data from YouTube Analytics API
 */

export interface YouTubeMetrics {
  views: number
  watchTime: number
  subscribers: number
  engagement: number
  engagementRate: number
}

export async function fetchYouTubeMetrics({
  accessToken,
  channelId,
  startDate,
  endDate,
}: {
  accessToken: string
  channelId: string
  startDate: string
  endDate: string
}): Promise<YouTubeMetrics> {
  try {
    // Get YouTube Analytics data
    const analyticsResponse = await fetch(
      'https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==' +
        channelId +
        '&start-date=' +
        startDate +
        '&end-date=' +
        endDate +
        '&metrics=views,estimatedMinutesWatched,likes,dislikes,comments&dimensions=day',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!analyticsResponse.ok) {
      console.error('YouTube Analytics API error:', analyticsResponse.status)
      return {
        views: 0,
        watchTime: 0,
        subscribers: 0,
        engagement: 0,
        engagementRate: 0,
      }
    }

    const analyticsData = await analyticsResponse.json()

    // Also get channel info for subscriber count
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=statistics&id=' + channelId,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    let subscribers = 0
    if (channelResponse.ok) {
      const channelData = await channelResponse.json()
      if (channelData.items?.[0]?.statistics?.subscriberCount) {
        subscribers = parseInt(channelData.items[0].statistics.subscriberCount, 10)
      }
    }

    // Parse analytics rows
    let views = 0
    let watchTime = 0
    let likes = 0
    let dislikes = 0
    let comments = 0

    if (analyticsData.rows) {
      for (const row of analyticsData.rows) {
        // columnHeaders: ['day', 'views', 'estimatedMinutesWatched', 'likes', 'dislikes', 'comments']
        views += row[1] || 0
        watchTime += row[2] || 0
        likes += row[3] || 0
        dislikes += row[4] || 0
        comments += row[5] || 0
      }
    }

    const engagement = likes + dislikes + comments
    const engagementRate = views > 0 ? (engagement / views) * 100 : 0

    return {
      views,
      watchTime: Math.round(watchTime),
      subscribers,
      engagement,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
    }
  } catch (error) {
    console.error('Error fetching YouTube metrics:', error)
    return {
      views: 0,
      watchTime: 0,
      subscribers: 0,
      engagement: 0,
      engagementRate: 0,
    }
  }
}
