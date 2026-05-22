select action, created_at, metadata
from public.audit_logs
where action like 'signature.%' or action like 'document.%'
order by created_at desc
limit 30;