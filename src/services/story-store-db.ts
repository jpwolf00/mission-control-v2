import { prisma } from '@/lib/prisma';
import { Story, CreateStoryInput } from '@/domain/story';
import { v4 as uuidv4 } from 'uuid';

export async function createStoryInDB(input: CreateStoryInput): Promise<Story> {
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
  });

  return mapPrismaToDomain(story);
}

export async function getStoriesFromDB(): Promise<Story[]> {
  const stories = await prisma.story.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return stories.map(mapPrismaToDomain);
}

export async function getStoryByIdFromDB(id: string): Promise<Story | null> {
  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      gates: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  
  if (!story) return null;
  return mapPrismaToDomain(story);
}

export async function approveRequirementsInDB(
  storyId: string,
  approved: boolean
): Promise<Story | null> {
  const story = await prisma.story.update({
    where: { id: storyId },
    data: {
      approvedRequirementsArtifact: approved,
      status: approved ? 'approved' : 'draft',
    },
  });
  
  return mapPrismaToDomain(story);
}

function mapPrismaToDomain(prismaStory: any): Story {
  return {
    id: prismaStory.id,
    status: prismaStory.status,
    metadata: {
      title: prismaStory.title,
      description: prismaStory.description || '',
      requirementsArtifactId: prismaStory.requirementsArtifactId || undefined,
      approvedRequirementsArtifact: prismaStory.approvedRequirementsArtifact,
      acceptanceCriteria: prismaStory.acceptanceCriteria || [],
      priority: prismaStory.priority as any,
    },
    createdAt: prismaStory.createdAt,
    updatedAt: prismaStory.updatedAt,
  };
}
