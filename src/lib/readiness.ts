import { supabase } from './supabase';

/**
 * Calculates and updates the user's readiness score based on Roadmap, Labs, and Interview progress.
 * Formula weights:
 * - 30% Roadmap (Completed tasks / Total tasks)
 * - 30% Labs (Labs completed / 5 total labs)
 * - 40% Interviews (Sum of scores / (5 scenarios * 10 max score))
 */
export async function updateReadinessScore(userId: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('roadmap_data, completed_roadmap_tasks, labs_completed, generated_interviews, interview_scores')
      .eq('id', userId)
      .single();

    if (!profile) return;

    // 1. Calculate Roadmap Score (0 to 30)
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
      roadmapScore = (completedTasks / totalTasks) * 30;
    }

    // 2. Calculate Labs Score (0 to 30)
    // Assume 5 labs total
    const labsCompleted = profile.labs_completed || 0;
    const labsScore = Math.min((labsCompleted / 5) * 30, 30);

    // 3. Calculate Interviews Score (0 to 40)
    // Assume 5 interviews generated, scored out of 10. Max total score = 50.
    let interviewsScore = 0;
    const scoresMap = (profile.interview_scores as Record<string, number>) || {};
    
    let sumOfScores = 0;
    Object.values(scoresMap).forEach(score => {
      sumOfScores += score;
    });

    const totalPossibleInterviewScore = 5 * 10; // 5 scenarios, 10 points each
    interviewsScore = Math.min((sumOfScores / totalPossibleInterviewScore) * 40, 40);

    // 4. Calculate Final Readiness
    const finalReadiness = Math.min(Math.round(roadmapScore + labsScore + interviewsScore), 100);

    // 5. Update Profile
    await supabase
      .from('profiles')
      .update({ readiness_score: finalReadiness })
      .eq('id', userId);

  } catch (error) {
    console.error('Error updating readiness score:', error);
  }
}
