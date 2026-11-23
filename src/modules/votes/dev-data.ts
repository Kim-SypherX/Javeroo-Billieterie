import { PRICING_CONFIG } from "@/config/pricing";
import { SEED_ORGANIZERS } from "@/modules/events/dev-data";
import type { VoteCampaignView } from "./types";

function daysFromNow(days: number, hour = 23): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 59, 0, 0);
  return d.toISOString();
}

export function buildSeedVoteCampaigns(): VoteCampaignView[] {
  const fasoScene = SEED_ORGANIZERS[0]!;
  const abidjanLive = SEED_ORGANIZERS[1]!;
  const dakarTech = SEED_ORGANIZERS[2]!;

  return [
    {
      id: "vote-miss-faso-2026",
      slug: "miss-jeunesse-burkina-2026",
      title: "Miss Jeunesse & Culture Burkina 2026",
      shortSummary:
        "Soutenez votre candidate favorite pour la grande finale nationale à Ouagadougou. 1 vote = 200 FCFA par Orange Money, Moov Money ou Wave.",
      description:
        "Les votes du public comptent pour 40 % de la note finale lors de la soirée de couronnement à la Salle des Banquets de Ouaga 2000.\n\nChaque vote est comptabilisé en temps réel et audité sur la plateforme Javeroo. Vous pouvez voter autant de fois que vous le souhaitez en choisissant un pack de 1, 5, 10, 25, 50 ou 100 voix sans créer de compte.",
      category: "miss",
      countryCode: "BF",
      city: "Ouagadougou",
      startsAt: daysFromNow(-5, 8),
      endsAt: daysFromNow(18, 23),
      timezone: "Africa/Ouagadougou",
      status: "OPEN",
      isFeatured: true,
      showLiveResults: true,
      unitVotePriceXof: 200,
      minVotesPerTx: 1,
      maxVotesPerTx: 500,
      quickPacks: [1, 5, 10, 25, 50, 100],
      commissionBps: PRICING_CONFIG.standardCommissionBps,
      bannerTheme: {
        from: "#1B2A4A",
        via: "#6D28D9",
        to: "#EC4899",
        badge: "CONCOURS OFFICIEL",
      },
      organizerId: fasoScene.id,
      organizer: fasoScene,
      candidates: [
        {
          id: "cand-miss-01",
          code: "C01",
          name: "Aminata Sawadogo",
          subtitle: "Région du Centre · Ouagadougou",
          bio: "Étudiante en architecture durable, ambassadrice de l'entrepreneuriat féminin et du Faso Dan Fani moderne.",
          accentColor: "#EC4899",
          votesCount: 1840,
          grossRaisedXof: 368_000,
        },
        {
          id: "cand-miss-02",
          code: "C02",
          name: "Fadoua Traoré",
          subtitle: "Hauts-Bassins · Bobo-Dioulasso",
          bio: "Passionnée d'arts vivants et d'éducation numérique pour les jeunes filles de l'Ouest.",
          accentColor: "#8B5CF6",
          votesCount: 1625,
          grossRaisedXof: 325_000,
        },
        {
          id: "cand-miss-03",
          code: "C03",
          name: "Mariam Ouédraogo",
          subtitle: "Plateau-Central · Ziniaré",
          bio: "Ingénieure agronome engagée dans la transformation locale du karité et du sésame.",
          accentColor: "#0EA5A4",
          votesCount: 1290,
          grossRaisedXof: 258_000,
        },
        {
          id: "cand-miss-04",
          code: "C04",
          name: "Clarisse Zongo",
          subtitle: "Centre-Ouest · Koudougou",
          bio: "Styliste créatrice valorisant les tissages traditionnels auprès de la diaspora.",
          accentColor: "#F59E0B",
          votesCount: 985,
          grossRaisedXof: 197_000,
        },
      ],
    },
    {
      id: "vote-abidjan-awards-2026",
      slug: "abidjan-urban-music-awards-2026",
      title: "Abidjan Urban Music Awards — Révélation de l'Année",
      shortSummary:
        "Qui remportera le trophée Révélation Afrobeat / Rap Ivoire 2026 ? Votez par Wave, Orange Money, MTN MoMo ou Moov Money (100 FCFA / voix).",
      description:
        "Le prix du public des Abidjan Urban Music Awards récompense l'artiste émergent ayant le plus marqué les scènes d'Abidjan, Bouaké et de toute la zone UEMOA.\n\nLes votes sont ouverts 24h/24 jusqu'à la cérémonie au Palais de la Culture de Treichville. Partagez le lien direct de votre artiste sur WhatsApp et TikTok !",
      category: "musique",
      countryCode: "CI",
      city: "Abidjan",
      startsAt: daysFromNow(-3, 10),
      endsAt: daysFromNow(14, 22),
      timezone: "Africa/Abidjan",
      status: "OPEN",
      isFeatured: true,
      showLiveResults: true,
      unitVotePriceXof: 100,
      minVotesPerTx: 1,
      maxVotesPerTx: 1000,
      quickPacks: [5, 10, 25, 50, 100, 250],
      commissionBps: PRICING_CONFIG.standardCommissionBps,
      bannerTheme: {
        from: "#0F172A",
        via: "#0F766E",
        to: "#F59E0B",
        badge: "AWARDS MUSIQUE",
      },
      organizerId: abidjanLive.id,
      organizer: abidjanLive,
      candidates: [
        {
          id: "cand-mus-01",
          code: "A01",
          name: "Koffi Vibe",
          subtitle: "Afrobeat / Coupé-Décalé · Cocody",
          bio: "Auteur du tube « Babi Night » (2,4 M de vues), connu pour ses performances live explosives.",
          accentColor: "#F59E0B",
          votesCount: 4120,
          grossRaisedXof: 412_000,
        },
        {
          id: "cand-mus-02",
          code: "A02",
          name: "Sira Flow",
          subtitle: "Rap Ivoire / Drill · Yopougon",
          bio: "Voix montante du rap féminin ouest-africain avec un EP salué par la critique.",
          accentColor: "#0EA5A4",
          votesCount: 3890,
          grossRaisedXof: 389_000,
        },
        {
          id: "cand-mus-03",
          code: "A03",
          name: "DJ Bamba & The Band",
          subtitle: "Afro-Fusion · Marcory",
          bio: "Collectif fusionnant percussions mandingues et électro urbaine.",
          accentColor: "#6366F1",
          votesCount: 2740,
          grossRaisedXof: 274_000,
        },
      ],
    },
    {
      id: "vote-uemoa-creators-2026",
      slug: "trophee-createurs-digitaux-uemoa-2026",
      title: "Trophée Meilleur Créateur de Contenu UEMOA 2026",
      shortSummary:
        "Élisez le créateur ou la créatrice tech, humour ou lifestyle le plus inspirant d'Afrique de l'Ouest francophone (250 FCFA / voix).",
      description:
        "Organisé en marge du Sommet Tech & Digital de Dakar, ce trophée célèbre les créateurs qui éduquent, divertissent et inspirent la jeunesse des 8 pays de l'UEMOA.\n\nVote instantané par Wave, Orange Money, MTN MoMo, Mixx ou carte bancaire avec reçu vérifié.",
      category: "createur",
      countryCode: "SN",
      city: "Dakar",
      startsAt: daysFromNow(-2, 9),
      endsAt: daysFromNow(25, 23),
      timezone: "Africa/Dakar",
      status: "OPEN",
      isFeatured: true,
      showLiveResults: true,
      unitVotePriceXof: 250,
      minVotesPerTx: 1,
      maxVotesPerTx: 500,
      quickPacks: [1, 5, 10, 20, 50, 100],
      commissionBps: PRICING_CONFIG.standardCommissionBps,
      bannerTheme: {
        from: "#1E1B4B",
        via: "#0284C7",
        to: "#14B8A6",
        badge: "CRÉATEURS UEMOA",
      },
      organizerId: dakarTech.id,
      organizer: dakarTech,
      candidates: [
        {
          id: "cand-crea-01",
          code: "CR1",
          name: "Cheikh Tech Dakar",
          subtitle: "Vulgarisation IA & Code · Sénégal",
          bio: "Plus de 350 000 abonnés formés gratuitement au développement web et à l'IA en français.",
          accentColor: "#0284C7",
          votesCount: 1510,
          grossRaisedXof: 377_500,
        },
        {
          id: "cand-crea-02",
          code: "CR2",
          name: "Aïcha Comédie BF",
          subtitle: "Humour & Sketchs · Burkina Faso",
          bio: "Ses chroniques quotidiennes sur la vie ouagalaise cumulent des millions de partages.",
          accentColor: "#14B8A6",
          votesCount: 1475,
          grossRaisedXof: 368_750,
        },
        {
          id: "cand-crea-03",
          code: "CR3",
          name: "Yannick Business CI",
          subtitle: "Entrepreneuriat & E-commerce · Côte d'Ivoire",
          bio: "Décrypte chaque semaine les business modèles qui réussissent en Afrique de l'Ouest.",
          accentColor: "#8B5CF6",
          votesCount: 1120,
          grossRaisedXof: 280_000,
        },
      ],
    },
  ];
}

