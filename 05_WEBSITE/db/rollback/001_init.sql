-- Reverse of 001_init.sql. Destroys registration data — run only as a deliberate rollback.
drop table if exists rate_limits;
drop table if exists admin_sessions;
drop table if exists visits;
drop table if exists visitors;
