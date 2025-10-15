<script lang="ts" setup>
import { initShop } from '@renderer/assets/scripts/shop'
import ShopItem from '@renderer/components/ShopItem.vue'
import { onMounted } from 'vue'

const data = [
  //     {
  //       uuid: "1",
  //       name: "Unban",
  //       serviceName: "unban_service",
  //       price: 100.0,
  //       src: "https://indrop.eu/assets/img/waitrp/products/unban-perm__icon.png",
  //       desc: `Odblokowuje zbanowane konto gracza (unban możliwy raz na 7 dni).
  // Tylko w przypadku bana nałożonego na określony czas.
  // Bany permamentne nie podlegają unbanowi.`,
  //     },
  {
    uuid: '2',
    name: 'Ranga VIP (30 dni)',
    serviceName: 'vip_rank',
    price: 20.0,
    src: 'https://dunb17ur4ymx4.cloudfront.net/packages/images/2123b603ed533af1d0985290cc4d220146668464.png',
    desc: `Nadaje rangę VIP na serwerze (30 dni)
- Komendy: /craft, /ec
- Dostep do 4 domów (/sethome)
- 2 public homes
- Priorytet kolejki przed graczami
- Kit VIP
- Expiarka pod /expiarka
- Omijanie AntyAFK'a`
  },
  {
    uuid: '3',
    name: 'Ranga MVP (30 dni)',
    serviceName: 'mvp_rank',
    price: 35.0,
    src: 'https://dunb17ur4ymx4.cloudfront.net/packages/images/91960ed90737dc2f6542c4ed65b0a01fdab721bc.png',
    desc: `Nadaje graczowi range MVP na serwerze (30 dni)
- Komendy: /craft, /ec, /pokeheal
- Wszystko, to co VIP
- Dostęp do /fly na dzialce
- Dostep do 8 domów (/sethome)
- 3 public homes
- Priorytet kolejki przed VIP i graczami
- Kit MVP
- Expiarka pod /expiarka
- Omijanie AntyAFK'a`
  },
  {
    uuid: '6',
    name: 'Ranga Ultra (30 dni)',
    serviceName: 'ultra_rank',
    price: 60.0,
    src: 'https://dunb17ur4ymx4.cloudfront.net/packages/images/af26090251b71ecaa5f0d0e52c271524b1070f18.png',
    desc: `Nadaje graczowi range Ultra na serwerze (30 dni).
- Komendy: /craft, /ec, /pokeheal, /hat
- Wsztstko z MVP i VIIP
- Dostep do 12 domów (/sethome)
- 4 public homes
- Priorytet kolejki przed MVP, VIP i graczami
- Kit Ultra
- Expiarka pod /expiarka
- Omijanie AntyAFK'a`
  },
  {
    uuid: '4',
    name: 'Ranga Legenda (30 dni)',
    serviceName: 'legend_rank',
    price: 100.0,
    src: 'https://dunb17ur4ymx4.cloudfront.net/packages/images/6cd6f4aa12a6075185b62f716c96e522febc0ab4.png',
    desc: `Nadaje graczowi range Legenda na serwerze (30 dni)
- Komendy: /craft, /ec, /pokeheal, /hat, /heal
- Dostęp do particli przez komendę /pp
- Wszystko z Ultra, MVP i VIP
- Dostep do 16 domów (/sethome)
- 5 public homes
- Priorytet kolejki przed Ultra, MVP, VIP i graczami
- Kit Legenda
- Expiarka pod /expiarka
- Omijanie AntyAFK'a
- Możliwość odebrania 1 klucza legendarnego (na miesiąc)`,
    commandToRun: '/crate key give legendary {amount} {player}'
  },
  {
    uuid: '8',
    name: 'Candy (1 szt)',
    serviceName: 'candy_item',
    isCountable: true,
    price: 2.0,
    src: 'https://64.media.tumblr.com/a778f4f1ffa74bece9c4e9eeb0c88a16/tumblr_mf6qgweH8g1rpn9eno1_500.png',
    desc: "Dodaje przedmiot 'Candy' na serwerze w wybranej ilości.",
    commandToRun: '/crate key give legendary {amount} {player}'
  },
  {
    uuid: '9',
    name: 'Masterball (1 szt)',
    serviceName: 'masterball_item',
    isCountable: true,
    price: 5.0,
    src: 'https://wiki.cobblemon.com/images/2/28/Master_Ball_%28model%29.png',
    desc: "Dodaje przedmiot 'Masterball' na serwerze w wybranej ilości.",
    commandToRun: '/crate key give legendary {amount} {player}'
  },
  {
    uuid: '10',
    name: 'Legendary Key (1 szt)',
    serviceName: 'legendary_key_item',
    isCountable: true,
    price: 30.0,
    src: 'https://wiki.hypixel.net/images/c/c5/Minecraft_items_tripwire_hook.png',
    desc: "Dodaje przedmiot 'Legendary Key' na serwerze w wybranej ilości.",
    commandToRun: '/crate key give legendary {amount} {player}'
  },
  {
    uuid: '11',
    name: 'Mythic Key (1 szt)',
    serviceName: 'mythic_key_item',
    isCountable: true,
    price: 15.0,
    src: 'https://wiki.hypixel.net/images/c/c5/Minecraft_items_tripwire_hook.png',
    desc: "Dodaje przedmiot 'Mythic Key' na serwerze w wybranej ilości.",
    commandToRun: '/crate key give mythic {amount} {player}'
  }
]

onMounted(() => {
  initShop()
})
</script>

<template>
  <div class="shop-container">
    <section class="shop-grid-wrap">
      <div class="shop-grid" data-aos="zoom-in">
        <ShopItem v-for="item in data" :key="item.uuid" :item="item" />
      </div>
    </section>
  </div>
</template>

<style>
.shop-container {
  max-height: 100%;
  overflow-y: auto;
}

.shop-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1200px) {
  .shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 768px) {
  .shop-grid {
    grid-template-columns: 1fr;
  }
}

.shopitem {
  position: relative;
  min-height: 320px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.02);
  box-shadow: var(--shadow);
  overflow: hidden;
  display: grid;
  place-items: center;
  transition:
    transform 0.18s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.shopitem::before {
  content: '';
  position: absolute;
  inset: -30% -10% auto -10%;
  height: 60%;
  background:
    radial-gradient(600px 200px at 20% 40%, rgba(92, 120, 246, 0.14), transparent 70%),
    radial-gradient(500px 180px at 80% 60%, rgba(88, 137, 242, 0.12), transparent 70%);
  pointer-events: none;
}

.shopitem:hover {
  transform: translateY(-5px);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.5);
  border-color: rgba(92, 141, 246, 0.35);
  cursor: pointer;
}

.shopitem img {
  width: min(68%, 360px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.45));
  transition: transform 0.18s ease;
}

.shopitem:hover img {
  transform: scale(1.04);
}

.shopitem .meta {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.shopitem .meta h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.shopitem .price {
  font-weight: 800;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 999px;
  color: #0a1a10;
  background: #28e083;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.06),
    0 6px 14px rgba(0, 0, 0, 0.25);
}
</style>
