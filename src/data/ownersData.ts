/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlatOwner } from '../types';

export const RAW_OWNERS_A: Record<number, { nameEn: string; nameGu: string; phone: string }> = {
  201: { nameEn: 'MADHURI NANDHA SANGHAVI', nameGu: 'માધુરી નાંઢા સંઘવી', phone: '' },
  202: { nameEn: 'YATINBHAI MASHRU', nameGu: 'યતિનભાઇ મશરૂ', phone: '9824329558' },
  203: { nameEn: 'VIJAY H. KARIA', nameGu: 'વિજય એચ. કારીયા', phone: '9825781900' },
  301: { nameEn: 'VISHAL BHAVINBHAI HINDOCHA', nameGu: 'વિશાલ ભાવીનભાઇ હીંડોચા', phone: '9825220709' },
  302: { nameEn: 'NIRAV VRUJLAL KARIA', nameGu: 'નિરવ વૃજલાલ કારીયા', phone: '9825225451' },
  303: { nameEn: 'VIVEK (RAJ) GANDUBHAI GADHIYA', nameGu: 'વિવેક (રાજ) ગાંડુભાઇ ગઢીયા', phone: '9624576760' },
  304: { nameEn: 'JAGDISH C. SHINGALA', nameGu: 'જગદિશ સી. શીંગાળા', phone: '9426135326' },
  401: { nameEn: 'KUSHAL VASANTRAY TIMBADIA', nameGu: 'કુશલ વસંતરાય ટીંબડીયા', phone: '9428441600' },
  402: { nameEn: 'DR. ARVIND SISODIYA', nameGu: 'ડૉ.ઓરવિંદ સીસોદીયા', phone: '9909187971' },
  403: { nameEn: 'VIMALBEN RASIKBHAI DAVDA', nameGu: 'વિમલબેન રસીકભાઇ દાવડા', phone: '7874151955' },
  501: { nameEn: 'SEEMA NIRAV PUROHIT', nameGu: 'સીમા નિરવ પુરોહીત', phone: '9825220311' },
  502: { nameEn: 'VIJAY RATILAL DHANESHA', nameGu: 'વિજય રતીલાલ ધનેશા', phone: '9428088707' },
  503: { nameEn: 'PRITESH JITENDRABHAI PAIDA', nameGu: 'પ્રિતેશ જીતેન્દ્રભાઇ પૈડા', phone: '8128273022' },
  504: { nameEn: 'JADAVBHAI KANABHAI RAM', nameGu: 'જાદવભાઇ કાનાભાઇ રામ', phone: '9428187694' },
  601: { nameEn: 'NITABEN MANISHBHAI YADAV', nameGu: 'નિતાબેન મનિષભાઇ યાદવ', phone: '9727715652' },
  602: { nameEn: 'GOVIND CHAVDA', nameGu: 'ગોવિંદ ચાવડા', phone: '9368411111' },
  603: { nameEn: 'RAMESHBHAI MULJIBHAI SODHA', nameGu: 'રમેશભાઇ મુળજીભાઇ સોઢા', phone: '9428249383' },
  604: { nameEn: 'BHARATBHAI PITHIYA', nameGu: 'ભરતભાઇ પીઠીયા', phone: '9904004522' },
  701: { nameEn: 'MITUL KIRITBHAI MAHETA', nameGu: 'મિતુલ કીરીટભાઇ મહેતા', phone: '9825858583' },
  702: { nameEn: 'DHRUVILBHAI MANIYAR', nameGu: 'ધ્રુવિલભાઇ મણીયાર', phone: '9979047471' },
  703: { nameEn: 'JITENDRA C. NATHWANI', nameGu: 'જીતેન્દ્ર સી. નથવાણી', phone: '9824187900' },
  704: { nameEn: 'PARESHBHAI DESAI', nameGu: 'પરેશભાઇ દેસાઇ', phone: '9825728082' },
  801: { nameEn: 'HASMUKHBHAI J. RATANPARA', nameGu: 'હસમુખભાઇ જે. રતનપરા', phone: '9824218600' },
  802: { nameEn: 'KETANKUMAR JAYANTILAL KACHHADIYA', nameGu: 'કેતનકુમાર જયંતિલાલ કાછડીયા', phone: '9727780905' },
  803: { nameEn: 'CHINTAN VRUJLAL KARIA', nameGu: 'ચિંતન વૃજલાલ કારીયા', phone: '9428262580' },
  804: { nameEn: 'PARESHBHAI KARIA', nameGu: 'પરેશભાઇ કારીયા', phone: '' },
  901: { nameEn: 'NALIN ALABHAI ODEDARA', nameGu: 'નલીન આલાભાઇ ઓડેદરા', phone: '9824295982' },
  902: { nameEn: 'SUNIL NARANDAS CHANIYARA', nameGu: 'સુનિલ નારણદાસ ચનીયારા', phone: '9426982191' },
  903: { nameEn: 'MOHIT PRAVINBHAI TANK', nameGu: 'મોહિત પ્રવિણભાઇ ટાંક', phone: '9537820006' },
  1001: { nameEn: 'BHAVIK MAHENDRABHAI JADAV', nameGu: 'ભાવિક મેહેન્દ્રભાઇ જાદવ', phone: '9824233655' },
  1002: { nameEn: 'DEVYANI B. KAMBALIYA', nameGu: 'નિરૂબેન કાંબલીયા', phone: '9998023380' },
  1003: { nameEn: 'PRAKASH MODHWADIA', nameGu: 'પ્રકાશ મોઢવાડીયા', phone: '9316662724' },
  1101: { nameEn: 'DR. JAYESH ALABHAI ODEDARA', nameGu: 'ડૉ.જયેશ આલાભાઇ ઓડેદરા', phone: '9824295982' },
  1102: { nameEn: 'DALSANIA NANDLALBHAI ANANDBHAI', nameGu: 'દલસાણીયા નંદલાલભાઇ આણંદભાઇ', phone: '9428378934' },
  1103: { nameEn: 'VINUBHAI CHANIYARA', nameGu: 'વિનુભાઇ ચનીયારા', phone: '9825142708' },
  1201: { nameEn: 'CHETNABEN SATISHBHAI DAVE', nameGu: 'ચેતનાબેન સતિષભાઇ દવે', phone: '9662513213' }
};

export const RAW_OWNERS_B: Record<number, { nameEn: string; nameGu: string; phone: string }> = {
  101: { nameEn: 'SHASIKANT JOSHI (RENTER)', nameGu: 'શશીકાત જોષી (ભાડુઆત)', phone: '9978441034' },
  102: { nameEn: 'MITESH V. HIRPARA', nameGu: 'મિતેષ વી. હિરપરા', phone: '8160698908' },
  103: { nameEn: 'DR. RAMYATA DAYATAR', nameGu: 'ડૉ.રમ્યતા દયાતર', phone: '9429047979' },
  104: { nameEn: 'RAVIBHAI PRAKASHCHANDRA KARIA', nameGu: 'રવિભાઇ પ્રકાશચંદ્ર કારીયા', phone: '8780163117' },
  201: { nameEn: 'CHETAN CHHAGANBHAI MARU', nameGu: 'ચેતન છગનભાઇ મારૂ', phone: '9427739252' },
  202: { nameEn: 'TEJASBHAI B. UNADKAT', nameGu: 'તેજસભાઇ બી. ઉનડકટ', phone: '9824510500' },
  203: { nameEn: 'YASH HITESHBHAI BHUPTANI', nameGu: 'યશ હિતેશભાઇ ભુપતાણી', phone: '9409123459' },
  204: { nameEn: 'DHARMENDRA BABULAL OZA', nameGu: 'ધર્મેન્દ્ર બાબુલાલ ઓઝા', phone: '9427446795' },
  301: { nameEn: 'DR.JIGNESH PRAVINBHAI SAMTA', nameGu: 'ડૉ.જીગ્નેશ પ્રવિણભાઇ સામતા', phone: '9426444290' },
  302: { nameEn: 'KETAN SURYAKANT KARIA', nameGu: 'કેતન સુર્યકાન્ત કારીયા', phone: '9227810111' },
  303: { nameEn: 'ATUL CHHAGANBHAI MARU', nameGu: 'અતુલ છગનભાઇ મારૂ', phone: '9924325716' },
  304: { nameEn: 'GIRISHBHAI S. ANADA', nameGu: 'ગીરીશભાઇ એસ. અનડા', phone: '9265377120' },
  401: { nameEn: 'SHANTILAL DRARKADAS UNADKAT', nameGu: 'શાંતિલાલ દ્વારકાદાસ ઉનડકટ', phone: '9824277076' },
  402: { nameEn: 'DINESHBHAI ZALA', nameGu: 'દિનેશભાઇ ઝાલા', phone: '9879477727' },
  403: { nameEn: 'VIJAYBHAI KAKUBHAI VYAS', nameGu: 'વિજયભાઇ કાકુભાઇ વ્યાસ', phone: '9427496836' },
  404: { nameEn: 'SANDIP JITEDNRABHAI SANGANI', nameGu: 'સંદિપ જીતેન્દ્રભાઇ સાંગાણી', phone: '9426732248' },
  501: { nameEn: 'CA PRATIK SURESHBHAI UNADKAT', nameGu: 'CA. પ્રતિક સુરેશભાઇ ઉનડકટ', phone: '9722802950' },
  502: { nameEn: 'DR.DHARMESH N. CHETARIYA', nameGu: 'ડૉ. ધર્મેશ એન. ચેતરીયા', phone: '9427268488' },
  503: { nameEn: 'PRAKASHBHAI HIRANI', nameGu: 'પ્રકાશભાઇ હિરાણી', phone: '9913236902' },
  504: { nameEn: 'KAUSHIKBHAI PUROHIT', nameGu: 'કૌશીકભાઇ પુરોહીતા', phone: '9909026986' },
  601: { nameEn: 'DIPTIBEN JITENDRA JHALA', nameGu: 'દિપ્તીબેન જીતેન્દ્ર ઝાલા', phone: '9428242708' },
  602: { nameEn: 'HIREN RAMESHBHAI POPAT', nameGu: 'હિરેન રમેશભાઇ પોપટ', phone: '9909231429' },
  603: { nameEn: 'JIGNESH CHIMANLAL KARIA', nameGu: 'જીગ્નેશ ચીમનલાલ કારીયા', phone: '9879129901' },
  604: { nameEn: 'KAMLESH M. RATHOD', nameGu: 'કમલેશ એમ. રાઠોડ', phone: '7874151955' },
  701: { nameEn: 'SURESHBHAI JAGDISHCHANDRA POPAT', nameGu: 'સુરેશભાઇ જગદીશચંદ્ર પોપટ', phone: '9408894883' },
  702: { nameEn: 'BHAVINBHAI MANEK', nameGu: 'ભાવીનભાઇ માણેક', phone: '9054625184' },
  703: { nameEn: 'MANOJ NANDLAL BHUPTANI', nameGu: 'મનોજ નંદલાલ ભુતપાની', phone: '9726066967' },
  704: { nameEn: 'CHETAN VINODRAI BHATT', nameGu: 'ચેતન વિનોદરાય ભટ્ટ', phone: '7801874000' },
  801: { nameEn: 'MANISHBHAI BUDHHBHATTI', nameGu: 'મનિષભાઇ બુધ્ધભટ્ટી', phone: '8160429850' },
  802: { nameEn: 'TANK NANJIBHAI KHIMJIBHAI', nameGu: 'ટાંક નાનજીભાઇ ખીમજીભાઇ', phone: '9327726259' },
  803: { nameEn: 'VIMAL ANILKUMAR LAKHANI', nameGu: 'વિમલ અનિલકુમાર લાખાણી', phone: '9879455150' },
  804: { nameEn: 'SURESH M. BHATT', nameGu: 'સુરેશ એમ. ભટ્ટ', phone: '9601032732' },
  901: { nameEn: 'BHIKHABHAI NARANBHAI MAKWANA', nameGu: 'ભીખાભાઇ નારણભાઇ મકવાણા', phone: '8849240127' },
  902: { nameEn: 'RAMBHAI BHIKHABHAI MAKWANA', nameGu: 'રામભાઇ ભીખાભાઇ મકવાણા', phone: '8849240127' },
  903: { nameEn: 'HITESHKUMAR C. KANTARIYA', nameGu: 'હિતેશકુમાર સી. કંટારીયા', phone: '9925393711' },
  904: { nameEn: 'ARUN BHUTAIYA', nameGu: 'અરૂણ ભુતૈયા', phone: '9825648395' },
  1001: { nameEn: 'KESHUBHAI D. PATEL', nameGu: 'કેશુભાઇ ડી. પટેલ', phone: '9426220937' },
  1002: { nameEn: 'DHARMESHBHAI KARSANBHAI DAVARA', nameGu: 'ધર્મેશભાઇ કરશનભાઇ ડાવરા', phone: '9427702124' },
  1003: { nameEn: 'PARESH RAVINDRABHAI DAVARA', nameGu: 'પરેશ રવિન્દ્રભાઇ ડાવરા', phone: '9879758627' },
  1004: { nameEn: 'DR. TRUPTIBEN K. VYAS', nameGu: 'ડૉ.તૃપ્તિબેન કે. વ્યાસ', phone: '9662030836' },
  1101: { nameEn: 'BAKULBHAI D. TAILI', nameGu: 'બકુલભાઇ ડી. તૈલી', phone: '7778959477' },
  1102: { nameEn: 'ASHVIN VITHALBHAI BHESANIYA', nameGu: 'અશ્વિન વિઠ્ઠલભાઇ ભેંસાણીયા', phone: '9974817482' },
  1103: { nameEn: 'SIHAL KESHUBHAI ODEDARA', nameGu: 'સિંહલ કેશુભાઇ ઓડેદરા', phone: '9825138905' },
  1104: { nameEn: 'RAHUL JASHVANTRAI POPAT', nameGu: 'રાહુલ જશવંતરાય પોપટ', phone: '9898180810' }, // This is the Admin too!
  1201: { nameEn: 'ATUL JERAMBHAI BUTANI', nameGu: 'અતુલ જેરામભાઇ બુટાણી', phone: '9979876303' },
  1202: { nameEn: 'CHANDRAKANT N. JADAV', nameGu: 'ચંદ્રકાન્ત એન. જાદવ', phone: '9909230477' },
  1203: { nameEn: 'MUKESH N. CHUDASAMA', nameGu: 'મુકેશ એન. ચુડાસમા', phone: '9892063606' },
  1204: { nameEn: 'BHARATBHAI MANDAVIYA', nameGu: 'ભરતભાઇ માંડવીયા', phone: '8347026516' }
};

export function getInitialOwners(): FlatOwner[] {
  const list: FlatOwner[] = [];
  const wings: ('A' | 'B')[] = ['A', 'B'];

  for (const wing of wings) {
    const rawMap = wing === 'A' ? RAW_OWNERS_A : RAW_OWNERS_B;
    // Generate 12 floors x 4 flats = 48 flats per wing
    for (let floor = 1; floor <= 12; floor++) {
      for (let flatIndex = 1; flatIndex <= 4; flatIndex++) {
        const flatNo = floor * 100 + flatIndex;
        const raw = rawMap[flatNo];

        if (raw) {
          list.push({
            wing,
            flatNo,
            nameEn: raw.nameEn,
            nameGu: raw.nameGu,
            phone: raw.phone,
            secondaryContact: '',
            members: [],
            vehicles: []
          });
        } else {
          list.push({
            wing,
            flatNo,
            nameEn: `Vacant / Owner Flat ${wing}-${flatNo}`,
            nameGu: `ખાલી ફ્લેટ ${wing}-${flatNo}`,
            phone: '',
            secondaryContact: '',
            members: [],
            vehicles: []
          });
        }
      }
    }
  }

  return list;
}
