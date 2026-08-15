-- ==============================================================================
-- Migration: Fix User Deletion & Enable Automatic ON DELETE CASCADE (Exact Schema)
-- ==============================================================================

DO $$ 
BEGIN
    -- 1. Table public.users -> auth.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_id_fkey' AND table_name = 'users') THEN
        ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
    END IF;
    ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

    -- 2. Table public.listings -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'listings_user_id_fkey' AND table_name = 'listings') THEN
        ALTER TABLE public.listings DROP CONSTRAINT listings_user_id_fkey;
    END IF;
    ALTER TABLE public.listings ADD CONSTRAINT listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'listings_claimed_by_fkey' AND table_name = 'listings') THEN
        ALTER TABLE public.listings DROP CONSTRAINT listings_claimed_by_fkey;
    END IF;
    ALTER TABLE public.listings ADD CONSTRAINT listings_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES public.users(id) ON DELETE SET NULL;

    -- 3. Table public.messages -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_sender_id_fkey' AND table_name = 'messages') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey;
    END IF;
    ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_receiver_id_fkey' AND table_name = 'messages') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_receiver_id_fkey;
    END IF;
    ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 4. Table public.favorites -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'favorites_user_id_fkey' AND table_name = 'favorites') THEN
        ALTER TABLE public.favorites DROP CONSTRAINT favorites_user_id_fkey;
    END IF;
    ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 5. Table public.reviews -> public.users (colonnes: reviewer_id et reviewed_id)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reviews_reviewer_id_fkey' AND table_name = 'reviews') THEN
        ALTER TABLE public.reviews DROP CONSTRAINT reviews_reviewer_id_fkey;
    END IF;
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reviews_reviewed_id_fkey' AND table_name = 'reviews') THEN
        ALTER TABLE public.reviews DROP CONSTRAINT reviews_reviewed_id_fkey;
    END IF;
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewed_id_fkey FOREIGN KEY (reviewed_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 6. Table public.orders -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_buyer_id_fkey' AND table_name = 'orders') THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_buyer_id_fkey;
    END IF;
    ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_seller_id_fkey' AND table_name = 'orders') THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_seller_id_fkey;
    END IF;
    ALTER TABLE public.orders ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 7. Table public.push_subscriptions -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'push_subscriptions_user_id_fkey' AND table_name = 'push_subscriptions') THEN
            ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_user_id_fkey;
        END IF;
        ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 8. Table public.monetization_transactions -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monetization_transactions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'monetization_transactions_user_id_fkey' AND table_name = 'monetization_transactions') THEN
            ALTER TABLE public.monetization_transactions DROP CONSTRAINT monetization_transactions_user_id_fkey;
        END IF;
        ALTER TABLE public.monetization_transactions ADD CONSTRAINT monetization_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 9. Table public.escrow_transactions -> auth.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escrow_transactions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'escrow_transactions_buyer_id_fkey' AND table_name = 'escrow_transactions') THEN
            ALTER TABLE public.escrow_transactions DROP CONSTRAINT escrow_transactions_buyer_id_fkey;
        END IF;
        ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'escrow_transactions_seller_id_fkey' AND table_name = 'escrow_transactions') THEN
            ALTER TABLE public.escrow_transactions DROP CONSTRAINT escrow_transactions_seller_id_fkey;
        END IF;
        ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 10. Table public.delivery_persons -> auth.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_persons') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'delivery_persons_user_id_fkey' AND table_name = 'delivery_persons') THEN
            ALTER TABLE public.delivery_persons DROP CONSTRAINT delivery_persons_user_id_fkey;
        END IF;
        ALTER TABLE public.delivery_persons ADD CONSTRAINT delivery_persons_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 11. Table public.delivery_person_reviews -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_person_reviews') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'delivery_person_reviews_reviewer_id_fkey' AND table_name = 'delivery_person_reviews') THEN
            ALTER TABLE public.delivery_person_reviews DROP CONSTRAINT delivery_person_reviews_reviewer_id_fkey;
        END IF;
        ALTER TABLE public.delivery_person_reviews ADD CONSTRAINT delivery_person_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 12. Table public.reports -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_reporter_id_fkey' AND table_name = 'reports') THEN
            ALTER TABLE public.reports DROP CONSTRAINT reports_reporter_id_fkey;
        END IF;
        ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_reported_user_id_fkey' AND table_name = 'reports') THEN
            ALTER TABLE public.reports DROP CONSTRAINT reports_reported_user_id_fkey;
        END IF;
        ALTER TABLE public.reports ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reports_resolved_by_fkey' AND table_name = 'reports') THEN
            ALTER TABLE public.reports DROP CONSTRAINT reports_resolved_by_fkey;
        END IF;
        ALTER TABLE public.reports ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- 13. Table public.seller_delivery_settings -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_delivery_settings') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'seller_delivery_settings_seller_id_fkey' AND table_name = 'seller_delivery_settings') THEN
            ALTER TABLE public.seller_delivery_settings DROP CONSTRAINT seller_delivery_settings_seller_id_fkey;
        END IF;
        ALTER TABLE public.seller_delivery_settings ADD CONSTRAINT seller_delivery_settings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 14. Table public.seller_delivery_affiliations -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_delivery_affiliations') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'seller_delivery_affiliations_seller_id_fkey' AND table_name = 'seller_delivery_affiliations') THEN
            ALTER TABLE public.seller_delivery_affiliations DROP CONSTRAINT seller_delivery_affiliations_seller_id_fkey;
        END IF;
        ALTER TABLE public.seller_delivery_affiliations ADD CONSTRAINT seller_delivery_affiliations_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 15. Table public.delivery_assignments -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_assignments') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'delivery_assignments_seller_id_fkey' AND table_name = 'delivery_assignments') THEN
            ALTER TABLE public.delivery_assignments DROP CONSTRAINT delivery_assignments_seller_id_fkey;
        END IF;
        ALTER TABLE public.delivery_assignments ADD CONSTRAINT delivery_assignments_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'delivery_assignments_resolved_by_fkey' AND table_name = 'delivery_assignments') THEN
            ALTER TABLE public.delivery_assignments DROP CONSTRAINT delivery_assignments_resolved_by_fkey;
        END IF;
        ALTER TABLE public.delivery_assignments ADD CONSTRAINT delivery_assignments_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- 16. Table public.user_feedbacks -> auth.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_feedbacks') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_feedbacks_user_id_fkey' AND table_name = 'user_feedbacks') THEN
            ALTER TABLE public.user_feedbacks DROP CONSTRAINT user_feedbacks_user_id_fkey;
        END IF;
        ALTER TABLE public.user_feedbacks ADD CONSTRAINT user_feedbacks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 17. Tables dépréciées (au cas où elles contiennent des données)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_deprecated_reservations') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reservations_buyer_id_fkey' AND table_name = '_deprecated_reservations') THEN
            ALTER TABLE public._deprecated_reservations DROP CONSTRAINT reservations_buyer_id_fkey;
            ALTER TABLE public._deprecated_reservations ADD CONSTRAINT reservations_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reservations_seller_id_fkey' AND table_name = '_deprecated_reservations') THEN
            ALTER TABLE public._deprecated_reservations DROP CONSTRAINT reservations_seller_id_fkey;
            ALTER TABLE public._deprecated_reservations ADD CONSTRAINT reservations_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_deprecated_user_reliability') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_reliability_user_id_fkey' AND table_name = '_deprecated_user_reliability') THEN
            ALTER TABLE public._deprecated_user_reliability DROP CONSTRAINT user_reliability_user_id_fkey;
            ALTER TABLE public._deprecated_user_reliability ADD CONSTRAINT user_reliability_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_deprecated_payment_methods') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payment_methods_user_id_fkey' AND table_name = '_deprecated_payment_methods') THEN
            ALTER TABLE public._deprecated_payment_methods DROP CONSTRAINT payment_methods_user_id_fkey;
            ALTER TABLE public._deprecated_payment_methods ADD CONSTRAINT payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banned_ips') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'banned_ips_banned_by_fkey' AND table_name = 'banned_ips') THEN
            ALTER TABLE public.banned_ips DROP CONSTRAINT banned_ips_banned_by_fkey;
            ALTER TABLE public.banned_ips ADD CONSTRAINT banned_ips_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;
