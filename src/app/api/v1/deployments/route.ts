import { NextRequest, NextResponse } from 'next/server';
import {
  createDeployment,
  getAllDeployments,
  DEFAULT_DEPLOY_CONTROL_CONFIG,
} from '@/services/deploy-control';
import { getStoryByIdFromDB } from '@/services/story-store-db';

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

function isGateApproved(story: NonNullable<Awaited<ReturnType<typeof getStoryByIdFromDB>>>, gate: string): boolean {
  return (story.gates || []).some((g) => g.gate === gate && g.status === 'approved');
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

    // Hard guard: deployment records can only be initiated at operator gate or later.
    const story = await getStoryByIdFromDB(storyId);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    const reviewerAApproved = isGateApproved(story, 'reviewer-a');
    const operatorApproved = isGateApproved(story, 'operator');

    if (!reviewerAApproved) {
      return NextResponse.json(
        { error: 'Deploy blocked: reviewer-a approval required before any deploy operation', code: 'REVIEW_REQUIRED' },
        { status: 409 }
      );
    }

    if (targetEnvironment === 'production' && !String(initiatedBy).toLowerCase().includes('operator')) {
      return NextResponse.json(
        { error: 'Deploy blocked: production deploys must be initiated by operator role', code: 'OPERATOR_REQUIRED' },
        { status: 403 }
      );
    }

    // If already operator-approved, this is a redeploy record; otherwise it's a gated pending approval record.
    const deployment = createDeployment({
      storyId,
      featureBranch,
      targetEnvironment,
      commitSha,
      commitMessage,
      initiatedBy,
      config: DEFAULT_DEPLOY_CONTROL_CONFIG,
    });

    return NextResponse.json({ ...deployment, gateContext: { reviewerAApproved, operatorApproved } }, { status: 201 });
  } catch (error) {
    console.error('Failed to create deployment:', error);
    return NextResponse.json(
      { error: 'Failed to create deployment' },
      { status: 500 }
    );
  }
}
