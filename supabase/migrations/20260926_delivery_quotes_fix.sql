-- Correctif : sans devis, la condition combinée évaluait v_dq.sellers alors
-- que v_dq n'est pas assigné (« record v_dq is not assigned yet »).
DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef(
    'public.create_cod_order(jsonb,text,text,text,double precision,double precision,text,jsonb,uuid)'::regprocedure
  );
  v_new := replace(v_def,
    E'  IF v_use_quote AND cardinality(v_order_ids) <> jsonb_array_length(v_dq.sellers) THEN\n'
    || E'    RAISE EXCEPTION ''quote_stale'' USING ERRCODE = ''DQ001'';\n'
    || E'  END IF;\n',
    E'  IF v_use_quote THEN\n'
    || E'    IF cardinality(v_order_ids) <> jsonb_array_length(v_dq.sellers) THEN\n'
    || E'      RAISE EXCEPTION ''quote_stale'' USING ERRCODE = ''DQ001'';\n'
    || E'    END IF;\n'
    || E'  END IF;\n');
  IF v_new = v_def THEN
    RAISE EXCEPTION 'create_cod_order : condition attendue introuvable';
  END IF;
  EXECUTE v_new;
END $$;
