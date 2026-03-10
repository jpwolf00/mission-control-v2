import { prisma } from '@/lib/prisma';
import { Story, StoryGateInfo, CreateStoryInput, StoryComment, StoryRevision } from '@/domain/story';
import { GATES } from '@/domain/workflow-types';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

export async function createStoryInDB(input: CreateStoryInput): Promise<Story> {
  try {
    const story = await prisma.story.create({
      data: {
        id: uuidv4(),
        title: input.title,
        description: input.description,
        requirementsArtifactId: input.requirementsArtifactId,
        acceptanceCriteria: input.acceptanceCriteria || [],
        priority: input.priority || 'medium',
        status: 'draft',
        approvedRequirementsArtifact: false,
      },
      include: { gates: true },
    });
    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in createStoryInDB:', error);
    throw new Error('Failed to create story in database');
  }
}

export async function getStoriesFromDB(): Promise<Story[]> {
  try {
    const stories = await prisma.story.findMany({
      orderBy: { createdAt: 'desc' },
      include: { gates: true },
    });
    return stories.map(mapPrismaToDomain);
  } catch (error) {
    console.error('Database error in getStoriesFromDB:', error);
    throw new Error('Failed to fetch stories from database');
  }
}

export async function getStoryByIdFromDB(id: string): Promise<Story | null> {
  try {
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        gates: true,
        sessions: {
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!story) return null;
    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in getStoryByIdFromDB:', error);
    throw new Error('Failed to fetch story from database');
  }
}

export async function approveRequirementsInDB(
  storyId: string,
  approved: boolean
): Promise<Story | null> {
  try {
    const story = await prisma.story.update({
      where: { id: storyId },
      data: {
        approvedRequirementsArtifact: approved,
        status: approved ? 'approved' : 'draft',
      },
      include: { gates: true },
    });

    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in approveRequirementsInDB:', error);
    throw new Error('Failed to approve requirements in database');
  }
}

/**
 * Persist a gate completion to the database (Story 1 fix)
 */
export async function saveGateCompletion(data: {
  storyId: string;
  gate: string;
  status: string;
  evidence: unknown;
  completedBy: string;
  pickedUpAt?: Date;       // When gate was dispatched/picked up (optional - may already be set at dispatch)
  finalMessage?: string;  // Final agent output/summary
  artifacts?: unknown[];   // Screenshot URLs, links, metadata
}): Promise<void> {
  try {
    // Check if gate already exists to preserve pickedUpAt if not provided
    const existingGate = await prisma.storyGate.findUnique({
      where: {
        storyId_gate: {
          storyId: data.storyId,
          gate: data.gate,
        },
      },
      select: { pickedUpAt: true },
    });

    // Only update pickedUpAt if explicitly provided (dispatch sets it, callback should not overwrite)
    const pickedUpAtValue = data.pickedUpAt ?? existingGate?.pickedUpAt ?? undefined;

    await prisma.storyGate.upsert({
      where: {
        storyId_gate: {
          storyId: data.storyId,
          gate: data.gate,
        },
      },
      update: {
        status: data.status,
        evidence: data.evidence as object ?? undefined,
        completedAt: data.status !== 'pending' ? new Date() : null,
        completedBy: data.completedBy,
        pickedUpAt: pickedUpAtValue,
        finalMessage: data.finalMessage ?? null,
        artifacts: data.artifacts as object ?? null,
      },
      create: {
        id: uuidv4(),
        storyId: data.storyId,
        gate: data.gate,
        status: data.status,
        evidence: data.evidence as object ?? undefined,
        completedAt: data.status !== 'pending' ? new Date() : null,
        completedBy: data.completedBy,
        pickedUpAt: pickedUpAtValue,
        finalMessage: data.finalMessage ?? null,
        artifacts: data.artifacts as object ?? null,
      },
    });
  } catch (error) {
    console.error('Database error in saveGateCompletion:', error);
    throw Error('Failed to save gate completion');
  }
}

/**
 * Update a story's status (Story 2 fix)
 */
export async function updateStoryStatus(storyId: string, status: string): Promise<void> {
  try {
    await prisma.story.update({
      where: { id: storyId },
      data: { status },
    });
  } catch (error) {
    console.error('Database error in updateStoryStatus:', error);
    throw new Error('Failed to update story status');
  }
}

// Type for Prisma story with optional gates relation
interface PrismaStoryWithGates {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  requirementsArtifactId: string | null;
  approvedRequirementsArtifact: boolean;
  acceptanceCriteria: string[];
  createdAt: Date;
  updatedAt: Date;
  gates?: Array<{
    id: string;
    gate: string;
    status: string;
    completedAt: Date | null;
    completedBy: string | null;
    pickedUpAt: Date | null;         // When gate was dispatched/picked up
    finalMessage: string | null;     // Final agent output/summary
    artifacts: Prisma.JsonValue;     // Screenshot URLs, links, metadata
  }>;
  sessions?: Array<{
    id: string;
    gate: string;
    status: string;
    model: string | null;
    provider: string | null;
    actualInvocations: number;
    lastHeartbeatAt: Date | null;
    startedAt: Date | null;
  }>;
  attachments?: Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    googleDriveUrl: string;
    description: string | null;
    createdAt: Date;
  }>;
}

/**
 * Compute the current gate based on completed gates (Story 3 fix)
 * Returns the next gate after the last approved one, or the first gate if none approved.
 */
function computeCurrentGate(gates: StoryGateInfo[], storyStatus: string): string | null {
  if (storyStatus === 'completed' || storyStatus === 'draft' || storyStatus === 'archived') {
    return null;
  }

  // Find the furthest approved gate in pipeline order
  const gateOrder = GATES as readonly string[];
  let lastApprovedIndex = -1;

  for (const gateInfo of gates) {
    if (gateInfo.status === 'approved') {
      const idx = gateOrder.indexOf(gateInfo.gate);
      if (idx > lastApprovedIndex) {
        lastApprovedIndex = idx;
      }
    }
  }

  // Next gate after last approved, or first gate if none approved yet
  const nextIndex = lastApprovedIndex + 1;
  if (nextIndex >= gateOrder.length) {
    return null; // All gates completed
  }

  return gateOrder[nextIndex];
}

function mapPrismaToDomain(prismaStory: PrismaStoryWithGates): Story {
  // Build a map of sessions by gate for telemetry lookup
  type SessionType = {
    id: string;
    gate: string;
    status: string;
    model: string | null;
    provider: string | null;
    actualInvocations: number;
    lastHeartbeatAt: Date | null;
    startedAt: Date | null;
  };
  const sessionByGate = new Map<string, SessionType>();
  if (prismaStory.sessions) {
    for (const session of prismaStory.sessions) {
      // Only add if not already present (take first/most recent)
      if (!sessionByGate.has(session.gate)) {
        sessionByGate.set(session.gate, session);
      }
    }
  }

  const gateInfos: StoryGateInfo[] = (prismaStory.gates || []).map((g) => {
    const session = sessionByGate.get(g.gate);
    return {
      gate: g.gate,
      status: g.status,
      pickedUpAt: g.pickedUpAt,
      completedAt: g.completedAt,
      completedBy: g.completedBy,
      finalMessage: g.finalMessage || undefined,
      artifacts: (g.artifacts as unknown as StoryGateInfo['artifacts']) || undefined,
      // Include session telemetry
      model: session?.model || null,
      provider: session?.provider || null,
      invocations: session?.actualInvocations || 0,
      lastHeartbeatAt: session?.lastHeartbeatAt || null,
      sessionId: session?.status === 'active' ? session.id : null,
    };
  });

  // Map attachments to StoryAttachmentRef format
  const attachmentRefs = (prismaStory.attachments || []).map((a) => ({
    id: a.id,
    filename: a.filename,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    googleDriveUrl: a.googleDriveUrl,
    description: a.description || undefined,
  }));

  return {
    id: prismaStory.id,
    status: prismaStory.status as Story['status'],
    metadata: {
      title: prismaStory.title,
      description: prismaStory.description || '',
      requirementsArtifactId: prismaStory.requirementsArtifactId || undefined,
      approvedRequirementsArtifact: prismaStory.approvedRequirementsArtifact,
      acceptanceCriteria: prismaStory.acceptanceCriteria,
      priority: (prismaStory.priority as Story['metadata']['priority']) || 'medium',
      attachments: attachmentRefs.length > 0 ? attachmentRefs : undefined,
    },
    gates: gateInfos,
    currentGate: computeCurrentGate(gateInfos, prismaStory.status),
    createdAt: prismaStory.createdAt,
    updatedAt: prismaStory.updatedAt,
  };
}

/**
 * Add a comment to a story (MC2: Revision loop feature)
 */
export async function addCommentToStory(
  storyId: string,
  content: string,
  author: string = 'user'
): Promise<StoryComment> {
  try {
    const comment = await prisma.storyComment.create({
      data: {
        id: uuidv4(),
        storyId,
        content,
        author,
      },
    });
    
    return {
      id: comment.id,
      storyId: comment.storyId,
      author: comment.author,
      content: comment.content,
      createdAt: comment.createdAt,
    };
  } catch (error) {
    console.error('Database error in addCommentToStory:', error);
    throw new Error('Failed to add comment to story');
  }
}

/**
 * Get all comments for a story (MC2: Revision loop feature)
 */
export async function getCommentsForStory(storyId: string): Promise<StoryComment[]> {
  try {
    const comments = await prisma.storyComment.findMany({
      where: { storyId },
      orderBy: { createdAt: 'asc' },
    });
    
    return comments.map((c) => ({
      id: c.id,
      storyId: c.storyId,
      author: c.author,
      content: c.content,
      createdAt: c.createdAt,
    }));
  } catch (error) {
    console.error('Database error in getCommentsForStory:', error);
    throw new Error('Failed to get comments for story');
  }
}

/**
 * Create a revision record (MC2: Revision loop feature)
 * Called when user accepts final or requests revision
 */
export async function createRevision(
  storyId: string,
  revisionType: 'accept_final' | 'request_revision',
  options?: {
    targetGate?: string;
    commentId?: string;
    description?: string;
    createdBy?: string;
  }
): Promise<StoryRevision> {
  try {
    const revision = await prisma.storyRevision.create({
      data: {
        id: uuidv4(),
        storyId,
        revisionType,
        targetGate: options?.targetGate,
        commentId: options?.commentId,
        description: options?.description,
        createdBy: options?.createdBy || 'user',
      },
    });
    
    return {
      id: revision.id,
      storyId: revision.storyId,
      revisionType: revision.revisionType as 'accept_final' | 'request_revision',
      targetGate: revision.targetGate || undefined,
      commentId: revision.commentId || undefined,
      description: revision.description || undefined,
      createdBy: revision.createdBy,
      createdAt: revision.createdAt,
    };
  } catch (error) {
    console.error('Database error in createRevision:', error);
    throw new Error('Failed to create revision');
  }
}

/**
 * Get all revisions for a story (MC2: Revision loop feature)
 */
export async function getRevisionsForStory(storyId: string): Promise<StoryRevision[]> {
  try {
    const revisions = await prisma.storyRevision.findMany({
      where: { storyId },
      orderBy: { createdAt: 'desc' },
    });
    
    return revisions.map((r) => ({
      id: r.id,
      storyId: r.storyId,
      revisionType: r.revisionType as 'accept_final' | 'request_revision',
      targetGate: r.targetGate || undefined,
      commentId: r.commentId || undefined,
      description: r.description || undefined,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('Database error in getRevisionsForStory:', error);
    throw new Error('Failed to get revisions for story');
  }
}

/**
 * Mark story as accepted final (MC2: Revision loop feature)
 */
export async function acceptFinalStory(storyId: string): Promise<Story | null> {
  try {
    const story = await prisma.story.update({
      where: { id: storyId },
      data: { status: 'archived' },
      include: { gates: true },
    });
    
    // Create revision record
    await createRevision(storyId, 'accept_final');
    
    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in acceptFinalStory:', error);
    throw new Error('Failed to accept final story');
  }
}

/**
 * Request revisions for a story (MC2: Revision loop feature)
 * Routes story back to the specified gate (default: implementer)
 */
export async function requestRevision(
  storyId: string,
  targetGate: string = 'implementer',
  description?: string
): Promise<Story | null> {
  try {
    // Get the story first to check current status
    const existingStory = await prisma.story.findUnique({
      where: { id: storyId },
    });
    
    if (!existingStory) {
      return null;
    }
    
    // Create revision record
    await createRevision(storyId, 'request_revision', {
      targetGate,
      description,
    });
    
    // Reset story status to active and set current gate to target
    const story = await prisma.story.update({
      where: { id: storyId },
      data: { 
        status: 'active',
      },
      include: { gates: true },
    });
    
    // Also reset gate status for the target gate to allow re-dispatch
    await prisma.storyGate.upsert({
      where: {
        storyId_gate: {
          storyId,
          gate: targetGate,
        },
      },
      update: {
        status: 'pending',
        completedAt: null,
        completedBy: null,
      },
      create: {
        id: uuidv4(),
        storyId,
        gate: targetGate,
        status: 'pending',
      },
    });
    
    return mapPrismaToDomain(story);
  } catch (error) {
    console.error('Database error in requestRevision:', error);
    throw new Error('Failed to request revision');
  }
}
