CREATE OR REPLACE FUNCTION get_questions_stats(question_ids UUID[])
RETURNS TABLE (
    question_id UUID,
    total_answers BIGINT,
    correct_answers BIGINT,
    percentage_correct NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ea.question_id,
        COUNT(*) as total_answers,
        COUNT(*) FILTER (WHERE ea.is_correct = true) as correct_answers,
        ROUND((COUNT(*) FILTER (WHERE ea.is_correct = true)::numeric / COUNT(*)::numeric) * 100, 2) as percentage_correct
    FROM
        exam_answers ea
    WHERE
        ea.question_id = ANY(question_ids)
    GROUP BY
        ea.question_id;
END;
$$ LANGUAGE plpgsql;
