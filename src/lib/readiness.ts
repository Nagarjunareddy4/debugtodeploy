import { supabase } from './supabase';

/**
 * Calculates and updates the user's readiness score based on Roadmap, Labs, and Interview progress.
 * Formula weights:
 * - 25% Roadmap (Completed tasks / Total tasks)
 * - 25% Labs (Labs completed / 5 total labs)
 * - 35% Interviews (Sum of scores / (5 scenarios * 10 max score))
 * - 15% Learning (Read docs / 6 total docs)
 */
export async function updateReadinessScore(userId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('roadmap_data, completed_roadmap_tasks, labs_completed, generated_interviews, interview_scores, read_docs_ids')
      .eq('id', userId)
      .single();

    if (!profile) return;

    // 1. Calculate Roadmap Score (0 to 25)
    let roadmapScore = 0;
    let totalTasks = 0;
    if (profile.roadmap_data) {
      try {
        const parsedRoadmap = typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data) : profile.roadmap_data;
        if (parsedRoadmap?.stages) {
          parsedRoadmap.stages.forEach((stage: any) => {
            if (stage.tasks) totalTasks += stage.tasks.length;
          });
        }
      } catch (e) {
        console.error("Failed to parse roadmap_data", e);
      }
    }
    
    const completedTasks = profile.completed_roadmap_tasks ? (profile.completed_roadmap_tasks as string[]).length : 0;
    if (totalTasks > 0) {
      roadmapScore = (completedTasks / totalTasks) * 25;
    }

    // 2. Calculate Labs Score (0 to 25)
    const labsCompleted = profile.labs_completed || 0;
    const labsScore = Math.min((labsCompleted / 5) * 25, 25);

    // 3. Calculate Interviews Score (0 to 35)
    let interviewsScore = 0;
    const scoresMap = (profile.interview_scores as Record<string, number>) || {};
    let sumOfScores = 0;
    Object.values(scoresMap).forEach(score => {
      sumOfScores += score;
    });
    const totalPossibleInterviewScore = 5 * 10;
    interviewsScore = Math.min((sumOfScores / totalPossibleInterviewScore) * 35, 35);

    // 4. Calculate Learning Score (0 to 15)
    const readDocsCount = profile.read_docs_ids ? (profile.read_docs_ids as string[]).length : 0;
    const learningScore = Math.min((readDocsCount / 6) * 15, 15);

    // 5. Calculate Final Readiness
    const finalReadiness = Math.min(Math.round(roadmapScore + labsScore + interviewsScore + learningScore), 100);

    // 6. Update Profile
    await supabase
      .from('profiles')
      .update({ readiness_score: finalReadiness })
      .eq('id', userId);

  } catch (error) {
    console.error('Error updating readiness score:', error);
  }
}
