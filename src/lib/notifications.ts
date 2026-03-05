// Notifications service - simplified stub
// TODO: Implement full notifications later

export async function sendSlackNotification(message: string): Promise<boolean> {
  console.log('[Notifications] Slack:', message);
  return true;
}

export async function sendEmailNotification(to: string, subject: string, body: string): Promise<boolean> {
  console.log('[Notifications] Email to:', to, 'subject:', subject);
  return true;
}

export async function notifyStoryCreated(storyId: string, title: string): Promise<void> {
  await sendSlackNotification(`Story created: ${title} (${storyId})`);
}

export async function notifyGateCompleted(storyId: string, gate: string): Promise<void> {
  await sendSlackNotification(`Gate completed: ${gate} for story ${storyId}`);
}

export async function notifyDeployment(storyId: string, environment: string, status: string): Promise<void> {
  await sendSlackNotification(`Deployment ${status} to ${environment} for story ${storyId}`);
}

export async function notifyBudgetWarning(current: number, limit: number): Promise<void> {
  await sendSlackNotification(`Budget warning: $${current}/$${limit}`);
}

export async function notifyStallDetected(storyId: string, gate: string, duration: number): Promise<void> {
  await sendSlackNotification(`Stall detected: story ${storyId} at ${gate} for ${duration} minutes`);
}

export async function checkAndNotifyStuckRuns(): Promise<{ storiesChecked: number; stuckFound: number }> {
  return { storiesChecked: 0, stuckFound: 0 };
}
