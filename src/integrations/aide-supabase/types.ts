export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accompagnements: {
        Row: {
          agent_id: string | null
          created_at: string
          date_action: string
          demande_id: string | null
          description: string
          duree_minutes: number | null
          id: string
          structure_id: string
          type_action: string
          usager_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          date_action?: string
          demande_id?: string | null
          description: string
          duree_minutes?: number | null
          id?: string
          structure_id: string
          type_action: string
          usager_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          date_action?: string
          demande_id?: string | null
          description?: string
          duree_minutes?: number | null
          id?: string
          structure_id?: string
          type_action?: string
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accompagnements_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "demandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accompagnements_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "vw_demandes_sans_besoin"
            referencedColumns: ["demande_id"]
          },
          {
            foreignKeyName: "accompagnements_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accompagnements_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accompagnements_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_role_switch_states: {
        Row: {
          original_roles: Database["public"]["Enums"]["app_role"][]
          original_structure_id: string | null
          original_structure_partenaire_id: string | null
          switched_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          original_roles: Database["public"]["Enums"]["app_role"][]
          original_structure_id?: string | null
          original_structure_partenaire_id?: string | null
          switched_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          original_roles?: Database["public"]["Enums"]["app_role"][]
          original_structure_id?: string | null
          original_structure_partenaire_id?: string | null
          switched_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ateliers: {
        Row: {
          created_at: string
          cree_par: string | null
          description: string | null
          id: string
          publie: boolean
          structure_id: string
          territoire_id: string | null
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cree_par?: string | null
          description?: string | null
          id?: string
          publie?: boolean
          structure_id: string
          territoire_id?: string | null
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cree_par?: string | null
          description?: string | null
          id?: string
          publie?: boolean
          structure_id?: string
          territoire_id?: string | null
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ateliers_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ateliers_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      ateliers_inscriptions: {
        Row: {
          created_at: string
          email: string | null
          id: string
          mailing_optin: boolean
          nom: string
          numero_etudiant: string | null
          prenom: string
          session_id: string
          source: string
          statut: Database["public"]["Enums"]["atelier_inscription_statut"]
          telephone: string | null
          usager_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          mailing_optin?: boolean
          nom: string
          numero_etudiant?: string | null
          prenom: string
          session_id: string
          source?: string
          statut?: Database["public"]["Enums"]["atelier_inscription_statut"]
          telephone?: string | null
          usager_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          mailing_optin?: boolean
          nom?: string
          numero_etudiant?: string | null
          prenom?: string
          session_id?: string
          source?: string
          statut?: Database["public"]["Enums"]["atelier_inscription_statut"]
          telephone?: string | null
          usager_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ateliers_inscriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ateliers_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ateliers_inscriptions_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ateliers_inscriptions_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      ateliers_sessions: {
        Row: {
          atelier_id: string
          created_at: string
          date_debut: string
          duree_minutes: number
          id: string
          lieu: string | null
          quota: number
          reminder_sent_at: string | null
        }
        Insert: {
          atelier_id: string
          created_at?: string
          date_debut: string
          duree_minutes?: number
          id?: string
          lieu?: string | null
          quota?: number
          reminder_sent_at?: string | null
        }
        Update: {
          atelier_id?: string
          created_at?: string
          date_debut?: string
          duree_minutes?: number
          id?: string
          lieu?: string | null
          quota?: number
          reminder_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ateliers_sessions_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "ateliers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      besoin_themes: {
        Row: {
          besoin_id: string
          created_at: string
          id: string
          theme_id: string
        }
        Insert: {
          besoin_id: string
          created_at?: string
          id?: string
          theme_id: string
        }
        Update: {
          besoin_id?: string
          created_at?: string
          id?: string
          theme_id?: string
        }
        Relationships: []
      }
      besoins: {
        Row: {
          actif: boolean
          code: string
          created_at: string
          id: string
          libelle: string
          ordre: number
          pour_etudiant: boolean
          pour_paej: boolean
          pour_pij: boolean
        }
        Insert: {
          actif?: boolean
          code: string
          created_at?: string
          id?: string
          libelle: string
          ordre?: number
          pour_etudiant?: boolean
          pour_paej?: boolean
          pour_pij?: boolean
        }
        Update: {
          actif?: boolean
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          ordre?: number
          pour_etudiant?: boolean
          pour_paej?: boolean
          pour_pij?: boolean
        }
        Relationships: []
      }
      besoins_correspondance: {
        Row: {
          created_at: string
          id: string
          mirror_besoin_id: string
          mode: string
          option_label: string | null
          ordre: number
          prompt_label: string | null
          source_besoin_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mirror_besoin_id: string
          mode: string
          option_label?: string | null
          ordre?: number
          prompt_label?: string | null
          source_besoin_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mirror_besoin_id?: string
          mode?: string
          option_label?: string | null
          ordre?: number
          prompt_label?: string | null
          source_besoin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "besoins_correspondance_mirror_besoin_id_fkey"
            columns: ["mirror_besoin_id"]
            isOneToOne: false
            referencedRelation: "besoins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "besoins_correspondance_source_besoin_id_fkey"
            columns: ["source_besoin_id"]
            isOneToOne: false
            referencedRelation: "besoins"
            referencedColumns: ["id"]
          },
        ]
      }
      consentements: {
        Row: {
          accepte: boolean
          contenu: string
          created_at: string
          date_consentement: string
          duree_conservation_mois: number
          id: string
          recueilli_par: string | null
          usager_id: string
          version: string
        }
        Insert: {
          accepte: boolean
          contenu: string
          created_at?: string
          date_consentement?: string
          duree_conservation_mois?: number
          id?: string
          recueilli_par?: string | null
          usager_id: string
          version?: string
        }
        Update: {
          accepte?: boolean
          contenu?: string
          created_at?: string
          date_consentement?: string
          duree_conservation_mois?: number
          id?: string
          recueilli_par?: string | null
          usager_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consentements_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consentements_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          derniere_lecture: string | null
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          derniere_lecture?: string | null
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          derniere_lecture?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          cree_par: string
          id: string
          titre: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
          usager_id: string | null
        }
        Insert: {
          created_at?: string
          cree_par: string
          id?: string
          titre?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
          usager_id?: string | null
        }
        Update: {
          created_at?: string
          cree_par?: string
          id?: string
          titre?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
          usager_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      coups_pouce: {
        Row: {
          created_at: string
          cree_par: string | null
          date_decision: string | null
          date_demande: string
          dispositif_id: string
          donnees_personnalisees: Json
          id: string
          montant: number | null
          notes: string | null
          statut: Database["public"]["Enums"]["coup_pouce_statut"]
          structure_id: string
          updated_at: string
          usager_id: string
        }
        Insert: {
          created_at?: string
          cree_par?: string | null
          date_decision?: string | null
          date_demande?: string
          dispositif_id: string
          donnees_personnalisees?: Json
          id?: string
          montant?: number | null
          notes?: string | null
          statut?: Database["public"]["Enums"]["coup_pouce_statut"]
          structure_id: string
          updated_at?: string
          usager_id: string
        }
        Update: {
          created_at?: string
          cree_par?: string | null
          date_decision?: string | null
          date_demande?: string
          dispositif_id?: string
          donnees_personnalisees?: Json
          id?: string
          montant?: number | null
          notes?: string | null
          statut?: Database["public"]["Enums"]["coup_pouce_statut"]
          structure_id?: string
          updated_at?: string
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coups_pouce_dispositif_id_fkey"
            columns: ["dispositif_id"]
            isOneToOne: false
            referencedRelation: "coups_pouce_dispositifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coups_pouce_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coups_pouce_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coups_pouce_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      coups_pouce_dispositifs: {
        Row: {
          actif: boolean
          champs_personnalises: Json
          code: string
          created_at: string
          description: string | null
          document_template: string | null
          document_titre: string | null
          expiration_jours: number | null
          id: string
          libelle: string
          montant_unitaire: number | null
          nb_bons_default: number | null
          ordre: number
          partenaire: string | null
          territoire_id: string | null
          type: string | null
        }
        Insert: {
          actif?: boolean
          champs_personnalises?: Json
          code: string
          created_at?: string
          description?: string | null
          document_template?: string | null
          document_titre?: string | null
          expiration_jours?: number | null
          id?: string
          libelle: string
          montant_unitaire?: number | null
          nb_bons_default?: number | null
          ordre?: number
          partenaire?: string | null
          territoire_id?: string | null
          type?: string | null
        }
        Update: {
          actif?: boolean
          champs_personnalises?: Json
          code?: string
          created_at?: string
          description?: string | null
          document_template?: string | null
          document_titre?: string | null
          expiration_jours?: number | null
          id?: string
          libelle?: string
          montant_unitaire?: number | null
          nb_bons_default?: number | null
          ordre?: number
          partenaire?: string | null
          territoire_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coups_pouce_dispositifs_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      coups_pouce_dispositifs_besoins: {
        Row: {
          besoin_id: string
          created_at: string
          dispositif_id: string
          id: string
          public_type: Database["public"]["Enums"]["type_public"]
          typologie: Database["public"]["Enums"]["demande_typologie"]
        }
        Insert: {
          besoin_id: string
          created_at?: string
          dispositif_id: string
          id?: string
          public_type: Database["public"]["Enums"]["type_public"]
          typologie: Database["public"]["Enums"]["demande_typologie"]
        }
        Update: {
          besoin_id?: string
          created_at?: string
          dispositif_id?: string
          id?: string
          public_type?: Database["public"]["Enums"]["type_public"]
          typologie?: Database["public"]["Enums"]["demande_typologie"]
        }
        Relationships: [
          {
            foreignKeyName: "coups_pouce_dispositifs_besoins_besoin_id_fkey"
            columns: ["besoin_id"]
            isOneToOne: false
            referencedRelation: "besoins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coups_pouce_dispositifs_besoins_dispositif_id_fkey"
            columns: ["dispositif_id"]
            isOneToOne: false
            referencedRelation: "coups_pouce_dispositifs"
            referencedColumns: ["id"]
          },
        ]
      }
      coups_pouce_dispositifs_partenaires: {
        Row: {
          created_at: string
          dispositif_id: string
          id: string
          peut_changer_statut: boolean
          peut_confirmer_passage: boolean
          peut_imprimer: boolean
          peut_remplir_fiche: boolean
          peut_voir: boolean
          structure_partenaire_id: string
        }
        Insert: {
          created_at?: string
          dispositif_id: string
          id?: string
          peut_changer_statut?: boolean
          peut_confirmer_passage?: boolean
          peut_imprimer?: boolean
          peut_remplir_fiche?: boolean
          peut_voir?: boolean
          structure_partenaire_id: string
        }
        Update: {
          created_at?: string
          dispositif_id?: string
          id?: string
          peut_changer_statut?: boolean
          peut_confirmer_passage?: boolean
          peut_imprimer?: boolean
          peut_remplir_fiche?: boolean
          peut_voir?: boolean
          structure_partenaire_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coups_pouce_dispositifs_partenaire_structure_partenaire_id_fkey"
            columns: ["structure_partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaire_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coups_pouce_dispositifs_partenaires_dispositif_id_fkey"
            columns: ["dispositif_id"]
            isOneToOne: false
            referencedRelation: "coups_pouce_dispositifs"
            referencedColumns: ["id"]
          },
        ]
      }
      coups_pouce_tickets: {
        Row: {
          coup_pouce_id: string
          created_at: string
          date_expiration: string | null
          date_utilisation: string | null
          id: string
          montant: number | null
          notes: string | null
          numero: string
          statut: string
          updated_at: string
          utilise_par_profile_id: string | null
          utilise_par_structure_partenaire_id: string | null
        }
        Insert: {
          coup_pouce_id: string
          created_at?: string
          date_expiration?: string | null
          date_utilisation?: string | null
          id?: string
          montant?: number | null
          notes?: string | null
          numero: string
          statut?: string
          updated_at?: string
          utilise_par_profile_id?: string | null
          utilise_par_structure_partenaire_id?: string | null
        }
        Update: {
          coup_pouce_id?: string
          created_at?: string
          date_expiration?: string | null
          date_utilisation?: string | null
          id?: string
          montant?: number | null
          notes?: string | null
          numero?: string
          statut?: string
          updated_at?: string
          utilise_par_profile_id?: string | null
          utilise_par_structure_partenaire_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coups_pouce_tickets_coup_pouce_id_fkey"
            columns: ["coup_pouce_id"]
            isOneToOne: false
            referencedRelation: "coups_pouce"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coups_pouce_tickets_utilise_par_profile_id_fkey"
            columns: ["utilise_par_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coups_pouce_tickets_utilise_par_structure_partenaire_id_fkey"
            columns: ["utilise_par_structure_partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaire_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes: {
        Row: {
          agent_referent_id: string | null
          created_at: string
          cree_par: string | null
          date_cloture: string | null
          description: string | null
          id: string
          nb_autres_accompagnants: number
          nb_parents: number
          orientation_vers: string | null
          priorite: Database["public"]["Enums"]["demande_priorite"]
          statut: Database["public"]["Enums"]["demande_statut"]
          structure_id: string
          titre: string
          type_accompagnement_paej:
            | Database["public"]["Enums"]["type_accompagnement_paej"]
            | null
          typologie: Database["public"]["Enums"]["demande_typologie"]
          updated_at: string
          usager_id: string
        }
        Insert: {
          agent_referent_id?: string | null
          created_at?: string
          cree_par?: string | null
          date_cloture?: string | null
          description?: string | null
          id?: string
          nb_autres_accompagnants?: number
          nb_parents?: number
          orientation_vers?: string | null
          priorite?: Database["public"]["Enums"]["demande_priorite"]
          statut?: Database["public"]["Enums"]["demande_statut"]
          structure_id: string
          titre: string
          type_accompagnement_paej?:
            | Database["public"]["Enums"]["type_accompagnement_paej"]
            | null
          typologie: Database["public"]["Enums"]["demande_typologie"]
          updated_at?: string
          usager_id: string
        }
        Update: {
          agent_referent_id?: string | null
          created_at?: string
          cree_par?: string | null
          date_cloture?: string | null
          description?: string | null
          id?: string
          nb_autres_accompagnants?: number
          nb_parents?: number
          orientation_vers?: string | null
          priorite?: Database["public"]["Enums"]["demande_priorite"]
          statut?: Database["public"]["Enums"]["demande_statut"]
          structure_id?: string
          titre?: string
          type_accompagnement_paej?:
            | Database["public"]["Enums"]["type_accompagnement_paej"]
            | null
          typologie?: Database["public"]["Enums"]["demande_typologie"]
          updated_at?: string
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_besoins: {
        Row: {
          besoin_id: string
          created_at: string
          demande_id: string
          id: string
          parent_id: string | null
          precision_libre: string | null
          prompt_response: Json | null
        }
        Insert: {
          besoin_id: string
          created_at?: string
          demande_id: string
          id?: string
          parent_id?: string | null
          precision_libre?: string | null
          prompt_response?: Json | null
        }
        Update: {
          besoin_id?: string
          created_at?: string
          demande_id?: string
          id?: string
          parent_id?: string | null
          precision_libre?: string | null
          prompt_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_besoins_besoin_id_fkey"
            columns: ["besoin_id"]
            isOneToOne: false
            referencedRelation: "besoins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_besoins_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "demandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_besoins_demande_id_fkey"
            columns: ["demande_id"]
            isOneToOne: false
            referencedRelation: "vw_demandes_sans_besoin"
            referencedColumns: ["demande_id"]
          },
          {
            foreignKeyName: "demandes_besoins_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "demandes_besoins"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_non_satisfaites: {
        Row: {
          article_id: string | null
          created_at: string
          cree_par: string | null
          date_satisfaction: string | null
          id: string
          libelle: string
          note: string | null
          quantite: number
          statut: string
          structure_id: string
          territoire_id: string | null
          updated_at: string
          usager_id: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          cree_par?: string | null
          date_satisfaction?: string | null
          id?: string
          libelle: string
          note?: string | null
          quantite?: number
          statut?: string
          structure_id: string
          territoire_id?: string | null
          updated_at?: string
          usager_id?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string
          cree_par?: string | null
          date_satisfaction?: string | null
          id?: string
          libelle?: string
          note?: string | null
          quantite?: number
          statut?: string
          structure_id?: string
          territoire_id?: string | null
          updated_at?: string
          usager_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_non_satisfaites_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "dons_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_non_satisfaites_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "vue_dons_stock"
            referencedColumns: ["article_id"]
          },
          {
            foreignKeyName: "demandes_non_satisfaites_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_non_satisfaites_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_non_satisfaites_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_non_satisfaites_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      dons_articles: {
        Row: {
          actif: boolean
          categorie_id: string
          created_at: string
          cree_par: string | null
          id: string
          last_stock_alert_at: string | null
          nom: string
          seuil_alerte: number
          structure_id: string
          suivi_peremption: boolean
          unite: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          categorie_id: string
          created_at?: string
          cree_par?: string | null
          id?: string
          last_stock_alert_at?: string | null
          nom: string
          seuil_alerte?: number
          structure_id: string
          suivi_peremption?: boolean
          unite?: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          categorie_id?: string
          created_at?: string
          cree_par?: string | null
          id?: string
          last_stock_alert_at?: string | null
          nom?: string
          seuil_alerte?: number
          structure_id?: string
          suivi_peremption?: boolean
          unite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dons_articles_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "dons_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dons_articles_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "vue_dons_stock"
            referencedColumns: ["categorie_id"]
          },
          {
            foreignKeyName: "dons_articles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
        ]
      }
      dons_categories: {
        Row: {
          actif: boolean
          code: string
          created_at: string
          id: string
          libelle: string
          ordre: number
        }
        Insert: {
          actif?: boolean
          code: string
          created_at?: string
          id?: string
          libelle: string
          ordre?: number
        }
        Update: {
          actif?: boolean
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          ordre?: number
        }
        Relationships: []
      }
      dons_distributions: {
        Row: {
          agent_id: string | null
          article_id: string
          created_at: string
          date_distribution: string
          id: string
          lot_id: string | null
          notes: string | null
          quantite: number
          structure_id: string
          usager_id: string
        }
        Insert: {
          agent_id?: string | null
          article_id: string
          created_at?: string
          date_distribution?: string
          id?: string
          lot_id?: string | null
          notes?: string | null
          quantite: number
          structure_id: string
          usager_id: string
        }
        Update: {
          agent_id?: string | null
          article_id?: string
          created_at?: string
          date_distribution?: string
          id?: string
          lot_id?: string | null
          notes?: string | null
          quantite?: number
          structure_id?: string
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dons_distributions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "dons_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dons_distributions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "vue_dons_stock"
            referencedColumns: ["article_id"]
          },
          {
            foreignKeyName: "dons_distributions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "dons_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dons_distributions_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dons_distributions_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dons_distributions_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      dons_lots: {
        Row: {
          article_id: string
          created_at: string
          cree_par: string | null
          date_arrivage: string
          date_peremption: string | null
          id: string
          last_peremption_alert_at: string | null
          notes: string | null
          provenance: string | null
          quantite_initiale: number
          quantite_restante: number
          structure_id: string
          updated_at: string
        }
        Insert: {
          article_id: string
          created_at?: string
          cree_par?: string | null
          date_arrivage?: string
          date_peremption?: string | null
          id?: string
          last_peremption_alert_at?: string | null
          notes?: string | null
          provenance?: string | null
          quantite_initiale: number
          quantite_restante: number
          structure_id: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          cree_par?: string | null
          date_arrivage?: string
          date_peremption?: string | null
          id?: string
          last_peremption_alert_at?: string | null
          notes?: string | null
          provenance?: string | null
          quantite_initiale?: number
          quantite_restante?: number
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dons_lots_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "dons_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dons_lots_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "vue_dons_stock"
            referencedColumns: ["article_id"]
          },
          {
            foreignKeyName: "dons_lots_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_votes: {
        Row: {
          created_at: string
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          created_at: string
          cree_par: string | null
          date_traitement: string | null
          description: string
          id: string
          module: string | null
          reponse_admin: string | null
          statut: Database["public"]["Enums"]["feature_request_statut"]
          titre: string
          traite_par: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cree_par?: string | null
          date_traitement?: string | null
          description: string
          id?: string
          module?: string | null
          reponse_admin?: string | null
          statut?: Database["public"]["Enums"]["feature_request_statut"]
          titre: string
          traite_par?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cree_par?: string | null
          date_traitement?: string | null
          description?: string
          id?: string
          module?: string | null
          reponse_admin?: string | null
          statut?: Database["public"]["Enums"]["feature_request_statut"]
          titre?: string
          traite_par?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_traite_par_fkey"
            columns: ["traite_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logement_dossiers: {
        Row: {
          bail_renouvele: boolean
          bail_signe_le: string | null
          cij_rdv_le: string | null
          created_at: string
          cree_par: string | null
          date_debut: string
          date_fin: string | null
          date_fin_prevue: string | null
          hebergement_cout: number | null
          hebergement_lieu: string | null
          hebergement_type: string | null
          id: string
          notes: string | null
          programme_id: string
          statut: Database["public"]["Enums"]["logement_dossier_statut"]
          structure_id: string
          territoire_id: string
          updated_at: string
          usager_id: string
        }
        Insert: {
          bail_renouvele?: boolean
          bail_signe_le?: string | null
          cij_rdv_le?: string | null
          created_at?: string
          cree_par?: string | null
          date_debut?: string
          date_fin?: string | null
          date_fin_prevue?: string | null
          hebergement_cout?: number | null
          hebergement_lieu?: string | null
          hebergement_type?: string | null
          id?: string
          notes?: string | null
          programme_id: string
          statut?: Database["public"]["Enums"]["logement_dossier_statut"]
          structure_id: string
          territoire_id: string
          updated_at?: string
          usager_id: string
        }
        Update: {
          bail_renouvele?: boolean
          bail_signe_le?: string | null
          cij_rdv_le?: string | null
          created_at?: string
          cree_par?: string | null
          date_debut?: string
          date_fin?: string | null
          date_fin_prevue?: string | null
          hebergement_cout?: number | null
          hebergement_lieu?: string | null
          hebergement_type?: string | null
          id?: string
          notes?: string | null
          programme_id?: string
          statut?: Database["public"]["Enums"]["logement_dossier_statut"]
          structure_id?: string
          territoire_id?: string
          updated_at?: string
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logement_dossiers_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "logement_programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logement_dossiers_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logement_dossiers_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logement_dossiers_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logement_dossiers_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      logement_journal: {
        Row: {
          auteur_id: string
          contenu: string
          created_at: string
          date_entree: string
          dossier_id: string
          id: string
        }
        Insert: {
          auteur_id?: string
          contenu: string
          created_at?: string
          date_entree?: string
          dossier_id: string
          id?: string
        }
        Update: {
          auteur_id?: string
          contenu?: string
          created_at?: string
          date_entree?: string
          dossier_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logement_journal_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "logement_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      logement_programmes: {
        Row: {
          actif: boolean
          created_at: string
          description: string | null
          id: string
          nom: string
          territoire_id: string | null
          type: Database["public"]["Enums"]["logement_programme_type"]
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          territoire_id?: string | null
          type: Database["public"]["Enums"]["logement_programme_type"]
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          territoire_id?: string | null
          type?: Database["public"]["Enums"]["logement_programme_type"]
          updated_at?: string
        }
        Relationships: []
      }
      logement_programmes_partenaires: {
        Row: {
          created_at: string
          id: string
          ordre: number
          partenaire_id: string | null
          programme_id: string
          role_libelle: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordre?: number
          partenaire_id?: string | null
          programme_id: string
          role_libelle: string
        }
        Update: {
          created_at?: string
          id?: string
          ordre?: number
          partenaire_id?: string | null
          programme_id?: string
          role_libelle?: string
        }
        Relationships: [
          {
            foreignKeyName: "logement_programmes_partenaires_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logement_programmes_partenaires_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "logement_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          auteur_id: string
          contenu: string
          conversation_id: string
          created_at: string
          id: string
        }
        Insert: {
          auteur_id: string
          contenu: string
          conversation_id: string
          created_at?: string
          id?: string
        }
        Update: {
          auteur_id?: string
          contenu?: string
          conversation_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          auteur_id: string | null
          contenu: string
          created_at: string
          id: string
          structure_id: string
          usager_id: string
        }
        Insert: {
          auteur_id?: string | null
          contenu: string
          created_at?: string
          id?: string
          structure_id: string
          usager_id: string
        }
        Update: {
          auteur_id?: string | null
          contenu?: string
          created_at?: string
          id?: string
          structure_id?: string
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          destinataire_id: string
          id: string
          lien: string | null
          lue: boolean
          message: string
          titre: string
        }
        Insert: {
          created_at?: string
          destinataire_id: string
          id?: string
          lien?: string | null
          lue?: boolean
          message: string
          titre: string
        }
        Update: {
          created_at?: string
          destinataire_id?: string
          id?: string
          lien?: string | null
          lue?: boolean
          message?: string
          titre?: string
        }
        Relationships: []
      }
      parametres_alertes: {
        Row: {
          cle: string
          description: string | null
          libelle: string
          updated_at: string
          updated_by: string | null
          valeur: number
        }
        Insert: {
          cle: string
          description?: string | null
          libelle: string
          updated_at?: string
          updated_by?: string | null
          valeur?: number
        }
        Update: {
          cle?: string
          description?: string | null
          libelle?: string
          updated_at?: string
          updated_by?: string | null
          valeur?: number
        }
        Relationships: []
      }
      partenaire_invitations: {
        Row: {
          consume_le: string | null
          created_at: string
          email: string
          expire_le: string
          id: string
          invite_par: string | null
          nom: string | null
          prenom: string | null
          structure_partenaire_id: string | null
          token: string
        }
        Insert: {
          consume_le?: string | null
          created_at?: string
          email: string
          expire_le?: string
          id?: string
          invite_par?: string | null
          nom?: string | null
          prenom?: string | null
          structure_partenaire_id?: string | null
          token?: string
        }
        Update: {
          consume_le?: string | null
          created_at?: string
          email?: string
          expire_le?: string
          id?: string
          invite_par?: string | null
          nom?: string | null
          prenom?: string | null
          structure_partenaire_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "partenaire_invitations_structure_partenaire_id_fkey"
            columns: ["structure_partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaire_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      partenaire_structures: {
        Row: {
          actif: boolean
          adresse: string | null
          code_postal: string | null
          created_at: string
          cree_par: string | null
          email: string | null
          id: string
          nom: string
          site_web: string | null
          telephone: string | null
          territoire_id: string | null
          type: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          cree_par?: string | null
          email?: string | null
          id?: string
          nom: string
          site_web?: string | null
          telephone?: string | null
          territoire_id?: string | null
          type?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          cree_par?: string | null
          email?: string | null
          id?: string
          nom?: string
          site_web?: string | null
          telephone?: string | null
          territoire_id?: string | null
          type?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partenaire_structures_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      partenaires: {
        Row: {
          actif: boolean
          created_at: string
          cree_par: string | null
          email: string | null
          fonction: string | null
          id: string
          nom: string
          prenom: string | null
          structure_partenaire_id: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          cree_par?: string | null
          email?: string | null
          fonction?: string | null
          id?: string
          nom: string
          prenom?: string | null
          structure_partenaire_id?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          cree_par?: string | null
          email?: string | null
          fonction?: string | null
          id?: string
          nom?: string
          prenom?: string | null
          structure_partenaire_id?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partenaires_structure_partenaire_id_fkey"
            columns: ["structure_partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaire_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      partenaires_themes: {
        Row: {
          created_at: string
          id: string
          partenaire_id: string
          theme_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partenaire_id: string
          theme_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partenaire_id?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partenaires_themes_partenaire_id_fkey"
            columns: ["partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partenaires_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes_besoins"
            referencedColumns: ["id"]
          },
        ]
      }
      presto_notifications_log: {
        Row: {
          id: string
          kind: string
          request_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          kind: string
          request_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          kind?: string
          request_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presto_notifications_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "presto_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      presto_renewals: {
        Row: {
          commentaire: string | null
          created_at: string
          date_decision: string | null
          date_demande: string
          decided_by: string | null
          demande_par: string | null
          id: string
          motif: Database["public"]["Enums"]["presto_renewal_motif"]
          motif_autre: string | null
          nouvelle_date_retour: string | null
          request_id: string
          statut: Database["public"]["Enums"]["presto_renewal_statut"]
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          date_decision?: string | null
          date_demande?: string
          decided_by?: string | null
          demande_par?: string | null
          id?: string
          motif: Database["public"]["Enums"]["presto_renewal_motif"]
          motif_autre?: string | null
          nouvelle_date_retour?: string | null
          request_id: string
          statut?: Database["public"]["Enums"]["presto_renewal_statut"]
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          date_decision?: string | null
          date_demande?: string
          decided_by?: string | null
          demande_par?: string | null
          id?: string
          motif?: Database["public"]["Enums"]["presto_renewal_motif"]
          motif_autre?: string | null
          nouvelle_date_retour?: string | null
          request_id?: string
          statut?: Database["public"]["Enums"]["presto_renewal_statut"]
        }
        Relationships: [
          {
            foreignKeyName: "presto_renewals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "presto_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      presto_requests: {
        Row: {
          created_at: string
          created_by: string | null
          date_demande: string
          date_recup: string | null
          date_retour_effectif: string | null
          date_retour_prevue: string | null
          id: string
          observation: string | null
          statut: Database["public"]["Enums"]["presto_statut"]
          type_pret: Database["public"]["Enums"]["presto_type_pret"]
          updated_at: string
          urgence: number
          usager_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_demande?: string
          date_recup?: string | null
          date_retour_effectif?: string | null
          date_retour_prevue?: string | null
          id?: string
          observation?: string | null
          statut?: Database["public"]["Enums"]["presto_statut"]
          type_pret: Database["public"]["Enums"]["presto_type_pret"]
          updated_at?: string
          urgence?: number
          usager_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_demande?: string
          date_recup?: string | null
          date_retour_effectif?: string | null
          date_retour_prevue?: string | null
          id?: string
          observation?: string | null
          statut?: Database["public"]["Enums"]["presto_statut"]
          type_pret?: Database["public"]["Enums"]["presto_type_pret"]
          updated_at?: string
          urgence?: number
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presto_requests_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presto_requests_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      presto_settings: {
        Row: {
          id: number
          mails_scd: string[]
          stock_chromebook: number
          stock_pc: number
          subject_mail_avenant: string
          subject_mail_dispo: string
          template_mail_avenant: string
          template_mail_dispo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          mails_scd?: string[]
          stock_chromebook?: number
          stock_pc?: number
          subject_mail_avenant?: string
          subject_mail_dispo?: string
          template_mail_avenant?: string
          template_mail_dispo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          mails_scd?: string[]
          stock_chromebook?: number
          stock_pc?: number
          subject_mail_avenant?: string
          subject_mail_dispo?: string
          template_mail_avenant?: string
          template_mail_dispo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      presto_status_history: {
        Row: {
          ancien_statut: Database["public"]["Enums"]["presto_statut"] | null
          changed_at: string
          changed_by: string | null
          id: string
          note: string | null
          nouveau_statut: Database["public"]["Enums"]["presto_statut"]
          request_id: string
        }
        Insert: {
          ancien_statut?: Database["public"]["Enums"]["presto_statut"] | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          note?: string | null
          nouveau_statut: Database["public"]["Enums"]["presto_statut"]
          request_id: string
        }
        Update: {
          ancien_statut?: Database["public"]["Enums"]["presto_statut"] | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          note?: string | null
          nouveau_statut?: Database["public"]["Enums"]["presto_statut"]
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presto_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "presto_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          affectation: string | null
          auth_method: Database["public"]["Enums"]["auth_method"]
          cas_username: string | null
          created_at: string
          email: string
          fonction: string | null
          id: string
          nom: string | null
          prenom: string | null
          structure_id: string | null
          structure_partenaire_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          affectation?: string | null
          auth_method?: Database["public"]["Enums"]["auth_method"]
          cas_username?: string | null
          created_at?: string
          email: string
          fonction?: string | null
          id: string
          nom?: string | null
          prenom?: string | null
          structure_id?: string | null
          structure_partenaire_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          affectation?: string | null
          auth_method?: Database["public"]["Enums"]["auth_method"]
          cas_username?: string | null
          created_at?: string
          email?: string
          fonction?: string | null
          id?: string
          nom?: string | null
          prenom?: string | null
          structure_id?: string | null
          structure_partenaire_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_structure_partenaire_id_fkey"
            columns: ["structure_partenaire_id"]
            isOneToOne: false
            referencedRelation: "partenaire_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      rendez_vous: {
        Row: {
          agent_id: string | null
          created_at: string
          date_debut: string
          duree_minutes: number
          id: string
          lieu: string | null
          modalite: Database["public"]["Enums"]["rdv_modalite"]
          notes: string | null
          objet: string
          reminder_24h_sent_at: string | null
          reminder_48h_sent_at: string | null
          reminder_jour_sent_at: string | null
          statut: Database["public"]["Enums"]["rdv_statut"]
          structure_id: string
          updated_at: string
          usager_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          date_debut: string
          duree_minutes?: number
          id?: string
          lieu?: string | null
          modalite?: Database["public"]["Enums"]["rdv_modalite"]
          notes?: string | null
          objet: string
          reminder_24h_sent_at?: string | null
          reminder_48h_sent_at?: string | null
          reminder_jour_sent_at?: string | null
          statut?: Database["public"]["Enums"]["rdv_statut"]
          structure_id: string
          updated_at?: string
          usager_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          date_debut?: string
          duree_minutes?: number
          id?: string
          lieu?: string | null
          modalite?: Database["public"]["Enums"]["rdv_modalite"]
          notes?: string | null
          objet?: string
          reminder_24h_sent_at?: string | null
          reminder_48h_sent_at?: string | null
          reminder_jour_sent_at?: string | null
          statut?: Database["public"]["Enums"]["rdv_statut"]
          structure_id?: string
          updated_at?: string
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rendez_vous_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendez_vous_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendez_vous_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      reorientation_email_settings: {
        Row: {
          conclusion: string
          created_at: string
          id: string
          introduction: string
          mentions_legales: string | null
          objet_mail: string
          signature: string
          territoire_id: string | null
          updated_at: string
        }
        Insert: {
          conclusion?: string
          created_at?: string
          id?: string
          introduction?: string
          mentions_legales?: string | null
          objet_mail?: string
          signature?: string
          territoire_id?: string | null
          updated_at?: string
        }
        Update: {
          conclusion?: string
          created_at?: string
          id?: string
          introduction?: string
          mentions_legales?: string | null
          objet_mail?: string
          signature?: string
          territoire_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorientation_email_settings_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: true
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      reorientation_services: {
        Row: {
          actif: boolean
          adresse: string | null
          categorie: string | null
          created_at: string
          description: string | null
          email: string | null
          horaires: string | null
          id: string
          message_specifique: string | null
          nom: string
          ordre: number
          site_web: string | null
          telephone: string | null
          territoire_id: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          categorie?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          horaires?: string | null
          id?: string
          message_specifique?: string | null
          nom: string
          ordre?: number
          site_web?: string | null
          telephone?: string | null
          territoire_id?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          categorie?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          horaires?: string | null
          id?: string
          message_specifique?: string | null
          nom?: string
          ordre?: number
          site_web?: string | null
          telephone?: string | null
          territoire_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorientation_services_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      reorientations: {
        Row: {
          agent_id: string | null
          created_at: string
          date_reorientation: string
          id: string
          mail_destinataire: string | null
          mail_envoye: boolean
          mail_envoye_at: string | null
          motif: string | null
          service_id: string | null
          service_libre: string | null
          structure_id: string
          suivi_id: string | null
          usager_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          date_reorientation?: string
          id?: string
          mail_destinataire?: string | null
          mail_envoye?: boolean
          mail_envoye_at?: string | null
          motif?: string | null
          service_id?: string | null
          service_libre?: string | null
          structure_id: string
          suivi_id?: string | null
          usager_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          date_reorientation?: string
          id?: string
          mail_destinataire?: string | null
          mail_envoye?: boolean
          mail_envoye_at?: string | null
          motif?: string | null
          service_id?: string | null
          service_libre?: string | null
          structure_id?: string
          suivi_id?: string | null
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorientations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorientations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "reorientation_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorientations_suivi_id_fkey"
            columns: ["suivi_id"]
            isOneToOne: false
            referencedRelation: "suivis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorientations_suivi_id_fkey"
            columns: ["suivi_id"]
            isOneToOne: false
            referencedRelation: "vw_suivis_sans_besoin"
            referencedColumns: ["suivi_id"]
          },
        ]
      }
      rgpd_registre: {
        Row: {
          base_legale: string
          categories_donnees: string
          created_at: string
          destinataires: string | null
          duree_conservation: string
          finalite: string
          id: string
          mesures_securite: string | null
          ordre: number
          titre: string
          updated_at: string
        }
        Insert: {
          base_legale: string
          categories_donnees: string
          created_at?: string
          destinataires?: string | null
          duree_conservation: string
          finalite: string
          id?: string
          mesures_securite?: string | null
          ordre?: number
          titre: string
          updated_at?: string
        }
        Update: {
          base_legale?: string
          categories_donnees?: string
          created_at?: string
          destinataires?: string | null
          duree_conservation?: string
          finalite?: string
          id?: string
          mesures_securite?: string | null
          ordre?: number
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      sso_used_tokens: {
        Row: {
          consumed_at: string
          jti: string
        }
        Insert: {
          consumed_at?: string
          jti: string
        }
        Update: {
          consumed_at?: string
          jti?: string
        }
        Relationships: []
      }
      structures: {
        Row: {
          active: boolean
          adresse: string | null
          created_at: string
          email_contact: string | null
          id: string
          nom: string
          telephone: string | null
          territoire_id: string
          type: Database["public"]["Enums"]["type_structure"]
        }
        Insert: {
          active?: boolean
          adresse?: string | null
          created_at?: string
          email_contact?: string | null
          id?: string
          nom: string
          telephone?: string | null
          territoire_id: string
          type?: Database["public"]["Enums"]["type_structure"]
        }
        Update: {
          active?: boolean
          adresse?: string | null
          created_at?: string
          email_contact?: string | null
          id?: string
          nom?: string
          telephone?: string | null
          territoire_id?: string
          type?: Database["public"]["Enums"]["type_structure"]
        }
        Relationships: [
          {
            foreignKeyName: "structures_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      suivis: {
        Row: {
          auteur_id: string | null
          created_at: string
          date_visite: string
          id: string
          motif_venue: string | null
          solution_apportee: string | null
          structure_id: string
          updated_at: string
          usager_id: string
        }
        Insert: {
          auteur_id?: string | null
          created_at?: string
          date_visite?: string
          id?: string
          motif_venue?: string | null
          solution_apportee?: string | null
          structure_id: string
          updated_at?: string
          usager_id: string
        }
        Update: {
          auteur_id?: string | null
          created_at?: string
          date_visite?: string
          id?: string
          motif_venue?: string | null
          solution_apportee?: string | null
          structure_id?: string
          updated_at?: string
          usager_id?: string
        }
        Relationships: []
      }
      suivis_besoins: {
        Row: {
          besoin_id: string
          created_at: string
          id: string
          parent_id: string | null
          precision_libre: string | null
          prompt_response: Json | null
          suivi_id: string
        }
        Insert: {
          besoin_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          precision_libre?: string | null
          prompt_response?: Json | null
          suivi_id: string
        }
        Update: {
          besoin_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          precision_libre?: string | null
          prompt_response?: Json | null
          suivi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suivis_besoins_besoin_id_fkey"
            columns: ["besoin_id"]
            isOneToOne: false
            referencedRelation: "besoins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suivis_besoins_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "suivis_besoins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suivis_besoins_suivi_id_fkey"
            columns: ["suivi_id"]
            isOneToOne: false
            referencedRelation: "suivis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suivis_besoins_suivi_id_fkey"
            columns: ["suivi_id"]
            isOneToOne: false
            referencedRelation: "vw_suivis_sans_besoin"
            referencedColumns: ["suivi_id"]
          },
        ]
      }
      territoires: {
        Row: {
          accueille_etudiant: boolean
          accueille_paej: boolean
          accueille_pij: boolean
          code: string
          created_at: string
          departement: string | null
          id: string
          nom: string
        }
        Insert: {
          accueille_etudiant?: boolean
          accueille_paej?: boolean
          accueille_pij?: boolean
          code: string
          created_at?: string
          departement?: string | null
          id?: string
          nom: string
        }
        Update: {
          accueille_etudiant?: boolean
          accueille_paej?: boolean
          accueille_pij?: boolean
          code?: string
          created_at?: string
          departement?: string | null
          id?: string
          nom?: string
        }
        Relationships: []
      }
      themes_besoins: {
        Row: {
          code: string
          created_at: string
          id: string
          libelle: string
          ordre: number
          pour_etudiant: boolean
          pour_paej: boolean
          pour_pij: boolean
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          libelle: string
          ordre?: number
          pour_etudiant?: boolean
          pour_paej?: boolean
          pour_pij?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          libelle?: string
          ordre?: number
          pour_etudiant?: boolean
          pour_paej?: boolean
          pour_pij?: boolean
        }
        Relationships: []
      }
      usager_portail_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_accessed_at: string | null
          token: string
          usager_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          token: string
          usager_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          token?: string
          usager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usager_portail_tokens_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usager_portail_tokens_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
        ]
      }
      usagers: {
        Row: {
          adresse: string | null
          archive: boolean
          code_postal: string | null
          composante: string | null
          consentement_actif: boolean
          created_at: string
          cree_par: string | null
          date_dernier_consentement: string | null
          date_naissance: string | null
          date_suppression_prevue: string | null
          email: string | null
          etablissement: string | null
          genre: Database["public"]["Enums"]["usager_genre"]
          id: string
          mailing_inscrit: boolean
          mailing_inscrit_le: string | null
          mailing_optin: boolean
          niveau_etudes: string | null
          nom: string
          notes_internes: string | null
          numero_etudiant: string | null
          prenom: string
          situation: Database["public"]["Enums"]["usager_situation"]
          structure_creatrice_id: string
          telephone: string | null
          territoire_id: string
          type_public: Database["public"]["Enums"]["type_public"]
          updated_at: string
          urgence: boolean
          urgence_motif: string | null
          urgence_signalee_le: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          archive?: boolean
          code_postal?: string | null
          composante?: string | null
          consentement_actif?: boolean
          created_at?: string
          cree_par?: string | null
          date_dernier_consentement?: string | null
          date_naissance?: string | null
          date_suppression_prevue?: string | null
          email?: string | null
          etablissement?: string | null
          genre?: Database["public"]["Enums"]["usager_genre"]
          id?: string
          mailing_inscrit?: boolean
          mailing_inscrit_le?: string | null
          mailing_optin?: boolean
          niveau_etudes?: string | null
          nom: string
          notes_internes?: string | null
          numero_etudiant?: string | null
          prenom: string
          situation?: Database["public"]["Enums"]["usager_situation"]
          structure_creatrice_id: string
          telephone?: string | null
          territoire_id: string
          type_public?: Database["public"]["Enums"]["type_public"]
          updated_at?: string
          urgence?: boolean
          urgence_motif?: string | null
          urgence_signalee_le?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          archive?: boolean
          code_postal?: string | null
          composante?: string | null
          consentement_actif?: boolean
          created_at?: string
          cree_par?: string | null
          date_dernier_consentement?: string | null
          date_naissance?: string | null
          date_suppression_prevue?: string | null
          email?: string | null
          etablissement?: string | null
          genre?: Database["public"]["Enums"]["usager_genre"]
          id?: string
          mailing_inscrit?: boolean
          mailing_inscrit_le?: string | null
          mailing_optin?: boolean
          niveau_etudes?: string | null
          nom?: string
          notes_internes?: string | null
          numero_etudiant?: string | null
          prenom?: string
          situation?: Database["public"]["Enums"]["usager_situation"]
          structure_creatrice_id?: string
          telephone?: string | null
          territoire_id?: string
          type_public?: Database["public"]["Enums"]["type_public"]
          updated_at?: string
          urgence?: boolean
          urgence_motif?: string | null
          urgence_signalee_le?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usagers_structure_creatrice_id_fkey"
            columns: ["structure_creatrice_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usagers_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vue_dons_stock: {
        Row: {
          actif: boolean | null
          article_id: string | null
          categorie_code: string | null
          categorie_id: string | null
          categorie_libelle: string | null
          nb_lots_actifs: number | null
          nb_lots_bientot_perimes: number | null
          nom: string | null
          prochaine_peremption: string | null
          seuil_alerte: number | null
          stock_total: number | null
          structure_id: string | null
          suivi_peremption: boolean | null
          unite: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dons_articles_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_demandes_sans_besoin: {
        Row: {
          created_at: string | null
          demande_id: string | null
          nom: string | null
          prenom: string | null
          territoire_id: string | null
          territoire_nom: string | null
          titre: string | null
          type_public: Database["public"]["Enums"]["type_public"] | null
          usager_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "usagers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_usager_id_fkey"
            columns: ["usager_id"]
            isOneToOne: false
            referencedRelation: "vw_usagers_a_purger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usagers_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_stats_publiques: {
        Row: {
          annee: number | null
          nb_usagers: number | null
          territoire_id: string | null
          type_public: Database["public"]["Enums"]["type_public"] | null
        }
        Relationships: [
          {
            foreignKeyName: "usagers_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_suivis_sans_besoin: {
        Row: {
          date_visite: string | null
          nom: string | null
          prenom: string | null
          suivi_id: string | null
          territoire_id: string | null
          territoire_nom: string | null
          type_public: Database["public"]["Enums"]["type_public"] | null
          usager_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usagers_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_usagers_a_purger: {
        Row: {
          created_at: string | null
          derniere_activite: string | null
          id: string | null
          nom: string | null
          prenom: string | null
          territoire_id: string | null
        }
        Insert: {
          created_at?: string | null
          derniere_activite?: never
          id?: string | null
          nom?: string | null
          prenom?: string | null
          territoire_id?: string | null
        }
        Update: {
          created_at?: string | null
          derniere_activite?: never
          id?: string | null
          nom?: string | null
          prenom?: string | null
          territoire_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usagers_territoire_id_fkey"
            columns: ["territoire_id"]
            isOneToOne: false
            referencedRelation: "territoires"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_impersonate_partenaire: {
        Args: { _structure_partenaire_id: string }
        Returns: undefined
      }
      admin_restore_user_roles: {
        Args: {
          _roles?: Database["public"]["Enums"]["app_role"][]
          _structure_id?: string
          _target_user: string
        }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _new_structure_id?: string
          _target_user: string
        }
        Returns: undefined
      }
      anonymize_usager: { Args: { _usager_id: string }; Returns: undefined }
      can_access_presto: { Args: { _user_id: string }; Returns: boolean }
      can_access_usager: {
        Args: { _usager_id: string; _user_id: string }
        Returns: boolean
      }
      get_portail_usager: { Args: { _token: string }; Returns: Json }
      get_user_structure: { Args: { _user_id: string }; Returns: string }
      get_user_structure_partenaire: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_territoire: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_in_conversation: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      partenaire_has_permission: {
        Args: { _dispositif_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      purge_old_sso_tokens: { Args: never; Returns: undefined }
      purge_old_usagers: {
        Args: { _dry_run?: boolean }
        Returns: {
          derniere_activite: string
          usager_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "superviseur"
        | "agent"
        | "partenaire"
        | "prescripteur"
        | "ccas"
        | "scd_presto"
      atelier_inscription_statut:
        | "inscrit"
        | "liste_attente"
        | "annule"
        | "present"
        | "absent"
      auth_method: "cas" | "email"
      conversation_type: "direct" | "groupe"
      coup_pouce_statut: "en_attente" | "accorde" | "refuse" | "cloture"
      demande_priorite: "basse" | "normale" | "haute" | "urgente"
      demande_statut:
        | "nouvelle"
        | "en_cours"
        | "orientee"
        | "cloturee"
        | "abandonnee"
      demande_typologie:
        | "logement"
        | "sante"
        | "social"
        | "financier"
        | "juridique"
        | "emploi_formation"
        | "mobilite"
        | "numerique"
        | "scolarite"
        | "psychologique"
        | "autre"
      feature_request_statut:
        | "nouvelle"
        | "etude"
        | "planifiee"
        | "livree"
        | "refusee"
      logement_dossier_statut: "ouvert" | "en_cours" | "cloture" | "abandonne"
      logement_programme_type: "urgence_ytineraire" | "hebergement_court"
      presto_renewal_motif: "stage" | "alternance" | "seconde_session" | "autre"
      presto_renewal_statut: "en_attente" | "accepte" | "refuse"
      presto_statut:
        | "demande_creee"
        | "en_attente_preparation"
        | "ordinateur_pret"
        | "materiel_recupere"
        | "en_cours_pret"
        | "demande_renouvellement"
        | "renouvellement_accepte"
        | "renouvellement_refuse"
        | "retour_effectue"
        | "cloture"
      presto_type_pret: "pc" | "chromebook"
      rdv_modalite: "presentiel" | "visio" | "telephone"
      rdv_statut: "planifie" | "confirme" | "realise" | "annule" | "absent"
      type_accompagnement_paej:
        | "individuel"
        | "parents"
        | "entourage_famille"
        | "autre"
      type_public: "etudiant" | "pij" | "paej"
      type_structure: "guichet_aide" | "bij" | "cij" | "caf" | "autre"
      usager_genre: "f" | "h" | "autre" | "non_precise" | "non_binaire"
      usager_situation:
        | "etudiant"
        | "lyceen"
        | "jeune_actif"
        | "demandeur_emploi"
        | "neet"
        | "autre"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "superviseur",
        "agent",
        "partenaire",
        "prescripteur",
        "ccas",
        "scd_presto",
      ],
      atelier_inscription_statut: [
        "inscrit",
        "liste_attente",
        "annule",
        "present",
        "absent",
      ],
      auth_method: ["cas", "email"],
      conversation_type: ["direct", "groupe"],
      coup_pouce_statut: ["en_attente", "accorde", "refuse", "cloture"],
      demande_priorite: ["basse", "normale", "haute", "urgente"],
      demande_statut: [
        "nouvelle",
        "en_cours",
        "orientee",
        "cloturee",
        "abandonnee",
      ],
      demande_typologie: [
        "logement",
        "sante",
        "social",
        "financier",
        "juridique",
        "emploi_formation",
        "mobilite",
        "numerique",
        "scolarite",
        "psychologique",
        "autre",
      ],
      feature_request_statut: [
        "nouvelle",
        "etude",
        "planifiee",
        "livree",
        "refusee",
      ],
      logement_dossier_statut: ["ouvert", "en_cours", "cloture", "abandonne"],
      logement_programme_type: ["urgence_ytineraire", "hebergement_court"],
      presto_renewal_motif: ["stage", "alternance", "seconde_session", "autre"],
      presto_renewal_statut: ["en_attente", "accepte", "refuse"],
      presto_statut: [
        "demande_creee",
        "en_attente_preparation",
        "ordinateur_pret",
        "materiel_recupere",
        "en_cours_pret",
        "demande_renouvellement",
        "renouvellement_accepte",
        "renouvellement_refuse",
        "retour_effectue",
        "cloture",
      ],
      presto_type_pret: ["pc", "chromebook"],
      rdv_modalite: ["presentiel", "visio", "telephone"],
      rdv_statut: ["planifie", "confirme", "realise", "annule", "absent"],
      type_accompagnement_paej: [
        "individuel",
        "parents",
        "entourage_famille",
        "autre",
      ],
      type_public: ["etudiant", "pij", "paej"],
      type_structure: ["guichet_aide", "bij", "cij", "caf", "autre"],
      usager_genre: ["f", "h", "autre", "non_precise", "non_binaire"],
      usager_situation: [
        "etudiant",
        "lyceen",
        "jeune_actif",
        "demandeur_emploi",
        "neet",
        "autre",
      ],
    },
  },
} as const
