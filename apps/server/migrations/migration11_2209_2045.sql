CREATE OR REPLACE FUNCTION prevent_approved_request_rollback()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'APPROVED' AND NEW.status = 'PENDING' THEN
        RAISE EXCEPTION 'Uma requisição aprovada não pode voltar para pendente.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS request_status_transition_guard ON request;

CREATE TRIGGER request_status_transition_guard
BEFORE UPDATE OF status ON request
FOR EACH ROW
EXECUTE FUNCTION prevent_approved_request_rollback();
