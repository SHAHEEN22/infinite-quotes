export interface TopicEntry {
  name: string;
  key: string;
  description: string;
  tags: string[];
}

export const CRYPTID_TOPICS: TopicEntry[] = [
  { name: "Jersey Devil", key: "jersey-devil", description: "Legendary creature of the Pine Barrens in New Jersey, said to be the cursed 13th child of Mother Leeds", tags: ["cryptid", "jersey-devil"] },
  { name: "Chupacabra", key: "chupacabra", description: "Blood-draining creature first reported in Puerto Rico in 1995, with sightings across the Americas", tags: ["cryptid", "chupacabra"] },
  { name: "Yowie", key: "yowie", description: "Large ape-like creature from Australian Aboriginal oral history, Australia's answer to Bigfoot", tags: ["cryptid", "yowie"] },
  { name: "Bunyip", key: "bunyip", description: "Water-dwelling creature from Australian Aboriginal mythology, said to lurk in swamps and billabongs", tags: ["cryptid", "bunyip"] },
  { name: "Mongolian Death Worm", key: "mongolian-death-worm", description: "Bright red worm said to inhabit the Gobi Desert, reportedly capable of spitting acid and generating electric shocks", tags: ["cryptid", "mongolian-death-worm"] },
  { name: "Tatzelwurm", key: "tatzelwurm", description: "Lizard-like creature reported in the Alps, described as a stubby serpent with cat-like features", tags: ["cryptid", "tatzelwurm"] },
  { name: "Dobhar-chú", key: "dobhar-chu", description: "Giant otter-like creature from Irish folklore, said to inhabit lakes and rivers", tags: ["cryptid", "dobhar-chu"] },
  { name: "Ahool", key: "ahool", description: "Giant bat-like creature reported in the rainforests of Java, with a wingspan reportedly over 10 feet", tags: ["cryptid", "ahool"] },
  { name: "Skunk Ape", key: "skunk-ape", description: "Foul-smelling hominid reported in the swamps of Florida and the southeastern United States", tags: ["cryptid", "skunk-ape"] },
  { name: "Ozark Howler", key: "ozark-howler", description: "Horned, shaggy creature reported in the Ozark Mountains with an eerie howl", tags: ["cryptid", "ozark-howler"] },
  { name: "Beast of Gévaudan", key: "beast-of-gevaudan", description: "Monstrous wolf-like creature that terrorized the French province of Gévaudan from 1764 to 1767", tags: ["cryptid", "beast-of-gevaudan"] },
  { name: "Loveland Frog", key: "loveland-frog", description: "Humanoid frog-like creature reported near Loveland, Ohio since the 1950s", tags: ["cryptid", "loveland-frog"] },
  { name: "Pope Lick Monster", key: "pope-lick-monster", description: "Part-man, part-goat creature said to haunt the railway trestle over Pope Lick Creek in Louisville, Kentucky", tags: ["cryptid", "pope-lick-monster"] },
  { name: "Flatwoods Monster", key: "flatwoods-monster", description: "Tall entity with a spade-shaped head encountered in Flatwoods, West Virginia in 1952", tags: ["cryptid", "flatwoods-monster"] },
  { name: "Van Meter Visitor", key: "van-meter-visitor", description: "Winged creature with a glowing horn that terrorized the town of Van Meter, Iowa in 1903", tags: ["cryptid", "van-meter-visitor"] },
  { name: "Altamaha-ha", key: "altamaha-ha", description: "Aquatic creature reported in the Altamaha River in Georgia, described as a sturgeon-like cryptid", tags: ["cryptid", "altamaha-ha"] },
  { name: "Cadborosaurus", key: "cadborosaurus", description: "Sea serpent reportedly seen in Cadboro Bay and the Pacific Northwest coast since the 1930s", tags: ["cryptid", "cadborosaurus"] },
  { name: "Ogopogo", key: "ogopogo", description: "Lake monster reportedly dwelling in Okanagan Lake, British Columbia, with sightings dating to the 19th century", tags: ["cryptid", "ogopogo"] },
  { name: "Beast of Busco", key: "beast-of-busco", description: "Giant snapping turtle reported in Churubusco, Indiana in 1949, sparking a multi-week hunt", tags: ["cryptid", "beast-of-busco"] },
  { name: "Batsquatch", key: "batsquatch", description: "Winged, primate-like creature sighted near Mount St. Helens in Washington state", tags: ["cryptid", "batsquatch"] },
  { name: "Yeti", key: "yeti", description: "The Abominable Snowman of the Himalayas, reported by Sherpa communities and mountaineers for centuries", tags: ["cryptid", "yeti"] },
];

export const SECRET_SOCIETY_TOPICS: TopicEntry[] = [
  { name: "Order of the Golden Dawn", key: "golden-dawn", description: "Late 19th-century British magical order that practiced ceremonial magic, founded by Mathers, Westcott, and Woodman", tags: ["secret-society", "golden-dawn"] },
  { name: "Thule Society", key: "thule-society", description: "German occultist and völkisch group in Munich, believed in a mythical northern homeland", tags: ["secret-society", "thule-society"] },
  { name: "Rosicrucians", key: "rosicrucians", description: "17th-century European secret society blending Christianity with alchemy, Kabbalah, and Hermeticism", tags: ["secret-society", "rosicrucians"] },
  { name: "Knights of the Golden Circle", key: "knights-golden-circle", description: "Secret society active in the American Civil War era, aimed at establishing a slave-holding empire", tags: ["secret-society", "knights-golden-circle"] },
  { name: "Ordo Templi Orientis", key: "oto", description: "International fraternal and religious organization practicing Thelema, influenced by Aleister Crowley", tags: ["secret-society", "oto"] },
  { name: "The Nine Unknown Men", key: "nine-unknown", description: "Legendary secret society founded by Emperor Ashoka in 270 BCE to preserve dangerous knowledge", tags: ["secret-society", "nine-unknown"] },
  { name: "Priory of Sion", key: "priory-of-sion", description: "Alleged secret society claiming descent from the Knights Templar, popularized by the Dossiers Secrets", tags: ["secret-society", "priory-of-sion"] },
  { name: "Hermetic Brotherhood of Luxor", key: "brotherhood-luxor", description: "19th-century occult order focused on practical occultism and the development of psychic powers", tags: ["secret-society", "brotherhood-luxor"] },
  { name: "Skull and Bones", key: "skull-and-bones", description: "Yale University secret society founded in 1832, with members including presidents and captains of industry", tags: ["secret-society", "skull-and-bones"] },
  { name: "Bohemian Club", key: "bohemian-club", description: "Exclusive San Francisco gentlemen's club known for its annual Bohemian Grove retreat and the Cremation of Care ceremony", tags: ["secret-society", "bohemian-club"] },
  { name: "Knights Templar", key: "knights-templar", description: "Medieval Catholic military order founded in 1119 to protect pilgrims, dissolved under accusations of heresy in 1312", tags: ["secret-society", "knights-templar"] },
  { name: "Alcoholics Anonymous (Esoteric Origins)", key: "aa-esoteric", description: "AA's roots in the Oxford Group, a Christian fellowship with ties to mystical and esoteric practices", tags: ["secret-society", "aa-esoteric"] },
];

export const CURSED_OBJECT_TOPICS: TopicEntry[] = [
  { name: "The Crying Boy Painting", key: "crying-boy", description: "Mass-produced painting blamed for a series of house fires in 1980s England after a Sun newspaper investigation", tags: ["cursed-object", "crying-boy"] },
  { name: "Robert the Doll", key: "robert-doll", description: "Supposedly haunted doll from Key West, Florida, blamed for misfortunes by those who disrespect it", tags: ["cursed-object", "robert-doll"] },
  { name: "The Dybbuk Box", key: "dybbuk-box", description: "Wine cabinet said to be haunted by a restless spirit, purchased at an estate sale in Portland, Oregon", tags: ["cursed-object", "dybbuk-box"] },
  { name: "Annabelle", key: "annabelle", description: "Raggedy Ann doll investigated by Ed and Lorraine Warren, now kept in their occult museum in Monroe, Connecticut", tags: ["cursed-object", "annabelle"] },
  { name: "The Basano Vase", key: "basano-vase", description: "15th-century Italian silver vase allegedly responsible for the deaths of all who possess it", tags: ["cursed-object", "basano-vase"] },
  { name: "The Delhi Purple Sapphire", key: "delhi-sapphire", description: "Amethyst looted from the Temple of Indra during the Indian Mutiny of 1857, bringing ruin to successive owners", tags: ["cursed-object", "delhi-sapphire"] },
  { name: "The Anguished Man Painting", key: "anguished-man", description: "Painting allegedly mixed with the artist's blood, reportedly causing poltergeist activity in its owners' homes", tags: ["cursed-object", "anguished-man"] },
  { name: "Busby's Stoop Chair", key: "busby-chair", description: "Pub chair in Thirsk, England cursed by murderer Thomas Busby in 1702, allegedly killing all who sit in it", tags: ["cursed-object", "busby-chair"] },
  { name: "The Myrtles Plantation Mirror", key: "myrtles-mirror", description: "Antique mirror in St. Francisville, Louisiana said to contain the spirits of Sara Woodruff and her children", tags: ["cursed-object", "myrtles-mirror"] },
  { name: "Maori Warrior Masks", key: "maori-masks", description: "Traditional Maori carved masks said to carry the spirits of their original warriors, considered tapu (sacred/forbidden)", tags: ["cursed-object", "maori-masks"] },
];

export const TRIVIA_TOPICS: TopicEntry[] = [
  { name: "Number Stations", key: "number-stations", description: "Shortwave radio stations that broadcast coded messages — strings of numbers, letters, or tones — believed to communicate with intelligence agents", tags: ["trivia", "number-stations"] },
  { name: "Ley Lines", key: "ley-lines", description: "Hypothetical alignments of ancient sites, megaliths, and landmarks, theorized to carry earth energy", tags: ["trivia", "ley-lines"] },
  { name: "Phantom Time Hypothesis", key: "phantom-time", description: "Heribert Illig's theory that 297 years of history (614–911 AD) were fabricated by the Holy Roman Emperor", tags: ["trivia", "phantom-time"] },
  { name: "Coral Castle", key: "coral-castle", description: "Massive limestone structure in Florida built single-handedly by Edward Leedskalnin, whose methods remain unexplained", tags: ["trivia", "coral-castle"] },
  { name: "Hessdalen Lights", key: "hessdalen-lights", description: "Unexplained lights observed in the Hessdalen valley of Norway since the 1930s, studied by Project Hessdalen", tags: ["trivia", "hessdalen-lights"] },
  { name: "The Wow! Signal", key: "wow-signal", description: "Strong narrowband radio signal detected by the Big Ear telescope in 1977, never repeated or explained", tags: ["trivia", "wow-signal"] },
  { name: "The Bloop", key: "bloop", description: "Ultra-low-frequency underwater sound detected by NOAA in 1997, initially unexplained and later attributed to icequakes", tags: ["trivia", "bloop"] },
  { name: "UVB-76", key: "uvb-76", description: "Russian shortwave radio station broadcasting a buzzing tone since the 1970s, with rare voice messages of unknown purpose", tags: ["trivia", "uvb-76"] },
  { name: "Roanoke Colony", key: "roanoke", description: "The 'Lost Colony' of English settlers on Roanoke Island who vanished between 1587 and 1590, leaving only the word CROATOAN", tags: ["trivia", "roanoke"] },
  { name: "Tunguska Event", key: "tunguska", description: "Massive explosion over Siberia in 1908 that flattened 2,000 square km of forest with no impact crater found", tags: ["trivia", "tunguska"] },
  { name: "Bermuda Triangle", key: "bermuda-triangle", description: "Loosely defined region in the western North Atlantic where ships and aircraft have reportedly vanished without explanation", tags: ["trivia", "bermuda-triangle"] },
  { name: "1561 Nuremberg Celestial Phenomenon", key: "nuremberg-1561", description: "Mass sighting of spheres, cylinders, and crosses in the sky over Nuremberg, Germany, depicted in a famous woodcut", tags: ["trivia", "nuremberg-1561", "ufo"] },
  { name: "Voynich Manuscript", key: "voynich", description: "15th-century illustrated manuscript written in an undeciphered script with bizarre botanical and astronomical illustrations", tags: ["trivia", "voynich"] },
  { name: "Foo Fighters (WWII)", key: "foo-fighters", description: "Mysterious aerial phenomena reported by Allied pilots during World War II — glowing orbs that followed aircraft", tags: ["trivia", "foo-fighters", "ufo"] },
  { name: "Marfa Lights", key: "marfa-lights", description: "Unexplained glowing orbs observed near Marfa, Texas since the 1880s, with no definitive scientific explanation", tags: ["trivia", "marfa-lights"] },
  { name: "The Green Children of Woolpit", key: "green-children", description: "Two green-skinned children who appeared in the English village of Woolpit in the 12th century, speaking an unknown language", tags: ["trivia", "green-children"] },
  { name: "Greek Fire", key: "greek-fire", description: "Incendiary weapon used by the Byzantine Empire whose exact composition remains one of history's enduring mysteries", tags: ["trivia", "greek-fire"] },
  { name: "The Philadelphia Experiment", key: "philadelphia-experiment", description: "Alleged US Navy experiment in 1943 that rendered the USS Eldridge invisible and teleported it from Philadelphia to Norfolk", tags: ["trivia", "philadelphia-experiment"] },
  { name: "Roswell Incident", key: "roswell", description: "The 1947 crash near Roswell, New Mexico — officially a weather balloon, widely believed to be a recovered alien craft", tags: ["trivia", "roswell", "ufo"] },
  { name: "The Montauk Project", key: "montauk", description: "Alleged secret government program at Camp Hero involving time travel, mind control, and interdimensional portals", tags: ["trivia", "montauk"] },
  { name: "Count Saint-Germain", key: "saint-germain", description: "Enigmatic 18th-century European courtier who claimed to be centuries old and to possess the secret of immortality", tags: ["trivia", "saint-germain"] },
  { name: "Project Blue Book", key: "project-blue-book", description: "US Air Force program that investigated UFO reports from 1952 to 1969, concluding most were misidentifications", tags: ["trivia", "project-blue-book", "ufo"] },
  { name: "The Phoenix Lights", key: "phoenix-lights", description: "Mass UFO sighting over Phoenix, Arizona on March 13, 1997 — a V-shaped formation witnessed by thousands", tags: ["trivia", "phoenix-lights", "ufo"] },
  { name: "Rendlesham Forest Incident", key: "rendlesham", description: "Series of reported UFO sightings near RAF Woodbridge in Suffolk, England in December 1980, Britain's most famous UFO case", tags: ["trivia", "rendlesham", "ufo"] },
];

/** Get all topics for a given fallback content type */
export function getTopicsForType(contentType: string): TopicEntry[] {
  switch (contentType) {
    case "cryptid": return CRYPTID_TOPICS;
    case "secret_society": return SECRET_SOCIETY_TOPICS;
    case "cursed_object": return CURSED_OBJECT_TOPICS;
    case "trivia": return TRIVIA_TOPICS;
    default: return [];
  }
}
