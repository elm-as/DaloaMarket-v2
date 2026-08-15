-- ==============================================================================
-- Migration: Fix User Deletion & Enable Automatic ON DELETE CASCADE
-- ==============================================================================
-- Cette migration permet de supprimer des utilisateurs depuis le Dashboard Supabase (auth.users)
-- sans bloquer sur des erreurs de contraintes de clés étrangères (Foreign Key Violation).

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

    -- 3. Table public.messages -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_sender_id_fkey' AND table_name = 'messages') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey;
    END IF;
    ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_receiver_id_fkey' AND table_name = 'messages') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_receiver_id_fkey;
    END IF;
    ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 4. Table public.reviews -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reviews_reviewer_id_fkey' AND table_name = 'reviews') THEN
        ALTER TABLE public.reviews DROP CONSTRAINT reviews_reviewer_id_fkey;
    END IF;
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reviews_seller_id_fkey' AND table_name = 'reviews') THEN
        ALTER TABLE public.reviews DROP CONSTRAINT reviews_seller_id_fkey;
    END IF;
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 5. Table public.favorites -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'favorites_user_id_fkey' AND table_name = 'favorites') THEN
        ALTER TABLE public.favorites DROP CONSTRAINT favorites_user_id_fkey;
    END IF;
    ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 6. Table public.orders -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_buyer_id_fkey' AND table_name = 'orders') THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_buyer_id_fkey;
    END IF;
    ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_seller_id_fkey' AND table_name = 'orders') THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_seller_id_fkey;
    END IF;
    ALTER TABLE public.orders ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;

    -- 7. Table public.cart_items -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cart_items_user_id_fkey' AND table_name = 'cart_items') THEN
            ALTER TABLE public.cart_items DROP CONSTRAINT cart_items_user_id_fkey;
        END IF;
        ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 8. Table public.notifications -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_user_id_fkey' AND table_name = 'notifications') THEN
            ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;
        END IF;
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 9. Table public.user_feedbacks -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_feedbacks') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_feedbacks_user_id_fkey' AND table_name = 'user_feedbacks') THEN
            ALTER TABLE public.user_feedbacks DROP CONSTRAINT user_feedbacks_user_id_fkey;
        END IF;
        ALTER TABLE public.user_feedbacks ADD CONSTRAINT user_feedbacks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 10. Table public.push_subscriptions -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'push_subscriptions_user_id_fkey' AND table_name = 'push_subscriptions') THEN
            ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_user_id_fkey;
        END IF;
        ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- 11. Table public.affiliated_deliverers -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliated_deliverers') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'affiliated_deliverers_seller_id_fkey' AND table_name = 'affiliated_deliverers') THEN
            ALTER TABLE public.affiliated_deliverers DROP CONSTRAINT affiliated_deliverers_seller_id_fkey;
            ALTER TABLE public.affiliated_deliverers ADD CONSTRAINT affiliated_deliverers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- 12. Table public.monetization_transactions -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monetization_transactions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'monetization_transactions_user_id_fkey' AND table_name = 'monetization_transactions') THEN
            ALTER TABLE public.monetization_transactions DROP CONSTRAINT monetization_transactions_user_id_fkey;
            ALTER TABLE public.monetization_transactions ADD CONSTRAINT monetization_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- 13. Table public.escrow_transactions -> public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escrow_transactions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'escrow_transactions_buyer_id_fkey' AND table_name = 'escrow_transactions') THEN
            ALTER TABLE public.escrow_transactions DROP CONSTRAINT escrow_transactions_buyer_id_fkey;
            ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'escrow_transactions_seller_id_fkey' AND table_name = 'escrow_transactions') THEN
            ALTER TABLE public.escrow_transactions DROP CONSTRAINT escrow_transactions_seller_id_fkey;
            ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;
