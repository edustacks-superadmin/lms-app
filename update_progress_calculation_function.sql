-- Updated PostgreSQL function to calculate course progress using member_id
CREATE OR REPLACE FUNCTION calculate_course_progress(
    p_member_id INT,
    p_course_id INT
) RETURNS INTEGER AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    progress_pct INTEGER;
BEGIN
    -- Count total content items in the course
    WITH course_contents AS (
        SELECT COUNT(DISTINCT cc.id) as content_count
        FROM chapter_contents cc
        JOIN chapters ch ON cc.chapter_id = ch.id
        WHERE ch.course_id = p_course_id
    )
    SELECT COALESCE(content_count, 0)
    INTO total_items
    FROM course_contents;
    
    -- Count completed items from content_progress
    SELECT COUNT(*)
    INTO completed_items
    FROM content_progress
    WHERE member_id = p_member_id
      AND course_id = p_course_id
      AND completed = true;
    
    -- Calculate percentage
    IF total_items = 0 THEN
        progress_pct := 0;
    ELSE
        progress_pct := ROUND((completed_items::DECIMAL / total_items) * 100);
    END IF;
    
    -- Update enrollments table with new progress
    UPDATE enrollments
    SET 
        progress = progress_pct,
        status = CASE 
            WHEN progress_pct = 100 THEN 'completed'
            WHEN progress_pct > 0 THEN 'active'
            ELSE status
        END,
        last_accessed_at = NOW()
    WHERE member_id = p_member_id 
      AND course_id = p_course_id;
      
    RETURN progress_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_course_progress(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_course_progress(INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION calculate_course_progress(INT, INT) TO service_role;

COMMENT ON FUNCTION calculate_course_progress IS 'Calculates and updates course progress based on completed content items using member_id';
