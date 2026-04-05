import { EmergencyInfo } from '../types';

// Static, manually verified emergency data. NOT AI-generated.
// Sources: official government travel advisory sites.
export const EMERGENCY_DATA: Record<string, EmergencyInfo> = {
  JP: {
    countryCode: 'JP',
    police: '110',
    ambulance: '119',
    fire: '119',
    advisoryUrl: 'https://www.us.emb-japan.go.jp',
    phrases: {
      help: '助けてください (Tasukete kudasai)',
      callAmbulance: '救急車を呼んでください (Kyuukyuusha wo yonde kudasai)',
      dontSpeak: '日本語が話せません (Nihongo ga hanasemasen)',
    },
  },
  TH: {
    countryCode: 'TH',
    police: '191',
    ambulance: '1669',
    fire: '199',
    advisoryUrl: 'https://www.thaiembassy.com',
    phrases: {
      help: 'ช่วยด้วย (Chuay duay)',
      callAmbulance: 'เรียกรถพยาบาลด้วย (Riak rot payaban duay)',
      dontSpeak: 'พูดไทยไม่ได้ (Phuut Thai mai dai)',
    },
  },
  IT: {
    countryCode: 'IT',
    police: '112',
    ambulance: '118',
    fire: '115',
    advisoryUrl: 'https://www.esteri.it',
    phrases: {
      help: 'Aiuto! (Ah-YOO-toh)',
      callAmbulance: 'Chiamate un\'ambulanza (Kee-ah-MAH-teh oon ahm-boo-LAHN-tsah)',
      dontSpeak: 'Non parlo italiano (Non PAR-loh ee-tah-lee-AH-noh)',
    },
  },
  ES: {
    countryCode: 'ES',
    police: '112',
    ambulance: '112',
    fire: '112',
    advisoryUrl: 'https://www.exteriores.gob.es',
    phrases: {
      help: '¡Ayuda! (Ah-YOO-dah)',
      callAmbulance: 'Llame a una ambulancia (YAH-meh ah OO-nah ahm-boo-LAHN-see-ah)',
      dontSpeak: 'No hablo español (Noh AH-bloh es-pahn-YOL)',
    },
  },
  FR: {
    countryCode: 'FR',
    police: '17',
    ambulance: '15',
    fire: '18',
    advisoryUrl: 'https://www.diplomatie.gouv.fr',
    phrases: {
      help: 'Au secours ! (Oh suh-KOOR)',
      callAmbulance: 'Appelez une ambulance (Ah-puh-LAY oon ahm-boo-LAHNSS)',
      dontSpeak: 'Je ne parle pas français (Zhuh nuh parl pah frahn-SAY)',
    },
  },
  DE: {
    countryCode: 'DE',
    police: '110',
    ambulance: '112',
    fire: '112',
    advisoryUrl: 'https://www.auswaertiges-amt.de',
    phrases: {
      help: 'Hilfe! (HIL-fuh)',
      callAmbulance: 'Rufen Sie einen Krankenwagen (ROO-fen zee EYE-nen KRAN-ken-vah-gen)',
      dontSpeak: 'Ich spreche kein Deutsch (Ikh SPREH-khuh kyne Doytsh)',
    },
  },
  KR: {
    countryCode: 'KR',
    police: '112',
    ambulance: '119',
    fire: '119',
    advisoryUrl: 'https://www.mofa.go.kr',
    phrases: {
      help: '도와주세요 (Dowajuseyo)',
      callAmbulance: '구급차를 불러주세요 (Gugeupchareul bulleojuseyo)',
      dontSpeak: '한국어를 못해요 (Hangugeo-reul mothaeyo)',
    },
  },
  CN: {
    countryCode: 'CN',
    police: '110',
    ambulance: '120',
    fire: '119',
    advisoryUrl: 'https://www.fmprc.gov.cn',
    phrases: {
      help: '救命 (Jiùmìng)',
      callAmbulance: '请叫救护车 (Qǐng jiào jiùhùchē)',
      dontSpeak: '我不会说中文 (Wǒ bù huì shuō zhōngwén)',
    },
  },
  VN: {
    countryCode: 'VN',
    police: '113',
    ambulance: '115',
    fire: '114',
    advisoryUrl: 'https://www.mofa.gov.vn',
    phrases: {
      help: 'Cứu tôi! (Kuu toy)',
      callAmbulance: 'Gọi xe cấp cứu (Goy seh kup kuu)',
      dontSpeak: 'Tôi không nói được tiếng Việt (Toy khong noy duoc tieng Viet)',
    },
  },
  BR: {
    countryCode: 'BR',
    police: '190',
    ambulance: '192',
    fire: '193',
    advisoryUrl: 'https://www.gov.br/mre',
    phrases: {
      help: 'Socorro! (Soh-KOH-hoo)',
      callAmbulance: 'Chame uma ambulância (SHAH-mee OO-mah ahm-boo-LAHN-see-ah)',
      dontSpeak: 'Eu não falo português (Eh-oo now FAH-loo por-too-GESH)',
    },
  },
  MX: {
    countryCode: 'MX',
    police: '911',
    ambulance: '911',
    fire: '911',
    advisoryUrl: 'https://www.gob.mx/sre',
    phrases: {
      help: '¡Ayuda! (Ah-YOO-dah)',
      callAmbulance: 'Llame a una ambulancia (YAH-meh ah OO-nah ahm-boo-LAHN-see-ah)',
      dontSpeak: 'No hablo español (Noh AH-bloh es-pahn-YOL)',
    },
  },
  TR: {
    countryCode: 'TR',
    police: '155',
    ambulance: '112',
    fire: '110',
    advisoryUrl: 'https://www.mfa.gov.tr',
    phrases: {
      help: 'İmdat! (Im-DAHT)',
      callAmbulance: 'Ambulans çağırın (Ahm-boo-LAHNS chah-uh-RUHN)',
      dontSpeak: 'Türkçe bilmiyorum (Turk-CHEH bil-mee-YOR-um)',
    },
  },
  IN: {
    countryCode: 'IN',
    police: '100',
    ambulance: '108',
    fire: '101',
    advisoryUrl: 'https://www.mea.gov.in',
    phrases: {
      help: 'मदद करो! (Madad karo!)',
      callAmbulance: 'एम्बुलेंस बुलाओ (Ambulance bulao)',
      dontSpeak: 'मुझे हिंदी नहीं आती (Mujhe Hindi nahi aati)',
    },
  },
};

// Fallback for countries without specific data
export const DEFAULT_EMERGENCY: EmergencyInfo = {
  countryCode: '',
  police: '112',
  ambulance: '112',
  fire: '112',
  advisoryUrl: 'https://travel.state.gov',
  phrases: {
    help: 'Help!',
    callAmbulance: 'Call an ambulance!',
    dontSpeak: 'I don\'t speak the local language.',
  },
};

export const getEmergencyInfo = (countryCode: string): EmergencyInfo =>
  EMERGENCY_DATA[countryCode] || { ...DEFAULT_EMERGENCY, countryCode };
