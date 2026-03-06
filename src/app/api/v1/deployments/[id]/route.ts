import { NextRequest, NextResponse } from 'next/server';
import {
  getDeployment,
  respondToApproval,
  startDeployment,
  initiateRollback,
  runVerification,
} from '@/services/deploy-control';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deployment = getDeployment(id);

    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(deployment);
  } catch (error) {
    console.error('Failed to fetch deployment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deployment' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, ...actionParams } = body;

    const deployment = getDeployment(id);
    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    let result;
    switch (action) {
      case 'approve':
        result = respondToApproval({
          deploymentId: id,
          approved: true,
          approverRole: actionParams.approverRole || 'operator',
          approverId: actionParams.approverId,
          comment: actionParams.comment,
        });
        break;
      case 'reject':
        result = respondToApproval({
          deploymentId: id,
          approved: false,
          approverRole: actionParams.approverRole || 'operator',
          approverId: actionParams.approverId,
          comment: actionParams.comment,
        });
        break;
      case 'start':
        result = startDeployment({
          deploymentId: id,
          startedBy: actionParams.startedBy,
        });
        break;
      case 'rollback':
        result = initiateRollback({
          deploymentId: id,
          requestedBy: actionParams.requestedBy,
          targetSha: actionParams.targetSha,
          reason: actionParams.reason,
        });
        break;
      case 'verify':
        result = runVerification({
          deploymentId: id,
          checklist: actionParams.checklist,
          verifiedBy: actionParams.verifiedBy,
        });
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 422 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update deployment:', error);
    return NextResponse.json(
      { error: 'Failed to update deployment' },
      { status: 500 }
    );
  }
}
