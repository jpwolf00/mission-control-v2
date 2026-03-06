import { NextRequest, NextResponse } from 'next/server';
import {
  createDeployment,
  getAllDeployments,
  DEFAULT_DEPLOY_CONTROL_CONFIG,
} from '@/services/deploy-control';

export async function GET() {
  try {
    const deployments = getAllDeployments();
    return NextResponse.json({ deployments });
  } catch (error) {
    console.error('Failed to fetch deployments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deployments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyId, featureBranch, targetEnvironment, commitSha, commitMessage, initiatedBy } = body;

    if (!storyId || !featureBranch || !targetEnvironment || !commitSha || !commitMessage || !initiatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 422 }
      );
    }

    const deployment = createDeployment({
      storyId,
      featureBranch,
      targetEnvironment,
      commitSha,
      commitMessage,
      initiatedBy,
      config: DEFAULT_DEPLOY_CONTROL_CONFIG,
    });

    return NextResponse.json(deployment, { status: 201 });
  } catch (error) {
    console.error('Failed to create deployment:', error);
    return NextResponse.json(
      { error: 'Failed to create deployment' },
      { status: 500 }
    );
  }
}
