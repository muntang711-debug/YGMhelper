const STORAGE={theme:"ygmhelper.theme",language:"ygmhelper.language",date:"ygmhelper.date",grade:"ygmhelper.timetableGrade",classNumber:"ygmhelper.timetableClass"};
const TEXT={ko:{navTimetable:"시간표",navMeal:"급식표",pageTitle:"이날의 학교생활",today:"오늘",mealTitle:"급식표",timetableTitle:"시간표",grade:"학년",class:"반",loading:"불러오는 중...",allergyGuide:"알레르기 번호 안내",allergyTitle:"알레르기 안내",noMeal:"등록된 급식 정보가 없습니다.",noTimetable:"등록된 시간표 정보가 없습니다.",mealError:"급식 정보를 불러오지 못했습니다.",timetableError:"시간표 정보를 불러오지 못했습니다.",calories:"열량",period:"교시",previousDay:"이전 날짜",nextDay:"다음 날짜",close:"닫기",refresh:"새로고침",previousMonth:"이전 달",nextMonth:"다음 달"},en:{navTimetable:"Timetable",navMeal:"Meal",pageTitle:"School information for this day",today:"Today",mealTitle:"Meal",timetableTitle:"Timetable",grade:"Grade",class:"Class",loading:"Loading...",allergyGuide:"Allergy number guide",allergyTitle:"Allergy information",noMeal:"No meal information is available.",noTimetable:"No timetable information is available.",mealError:"Unable to load meal information.",timetableError:"Unable to load timetable information.",calories:"Calories",period:"Period",previousDay:"Previous day",nextDay:"Next day",close:"Close",refresh:"Refresh",previousMonth:"Previous month",nextMonth:"Next month"}};
const ALLERGIES={ko:["난류","우유","메밀","땅콩","대두","밀","고등어","게","새우","돼지고기","복숭아","토마토","아황산류","호두","닭고기","쇠고기","오징어","조개류 (굴, 전복, 홍합 포함)","잣"],en:["Eggs","Milk","Buckwheat","Peanuts","Soybeans","Wheat","Mackerel","Crab","Shrimp","Pork","Peach","Tomato","Sulfites","Walnuts","Chicken","Beef","Squid","Shellfish (oyster, abalone, mussel)","Pine nuts"]};
const WEEKDAYS={ko:["일","월","화","수","목","금","토"],en:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]};
const MONTH_FORMAT={ko:new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long"}),en:new Intl.DateTimeFormat("en-US",{year:"numeric",month:"long"})};

const themeSaved=localStorage.getItem(STORAGE.theme);
const state={language:localStorage.getItem(STORAGE.language)||((navigator.language||"").toLowerCase().startsWith("ko")?"ko":"en"),theme:themeSaved==="light"||themeSaved==="dark"?themeSaved:(document.documentElement.dataset.theme==="dark"?"dark":"light"),date:getSavedDate(),grade:getNumber(STORAGE.grade,1,3),classNumber:getNumber(STORAGE.classNumber,1,15)};
let calendarCursor=null;

const $=s=>document.querySelector(s);
const el={
  brandTrigger:$("#brand-menu-trigger"),brandMenu:$("#brand-menu"),
  heroDate:$("#date-trigger"),
  prev:$("#previous-day"),next:$("#next-day"),today:$("#today-button"),
  meal:$("#meal-content"),tt:$("#timetable-content"),
  theme:$("#theme-toggle"),langs:[...document.querySelectorAll(".language-button")],
  allergy:$("#allergy-button"),modal:$("#allergy-modal"),close:$("#close-allergy-modal"),allergyList:$("#allergy-list"),
  datePopover:$("#date-popover"),calendarTitle:$("#calendar-title"),calendarGrid:$("#calendar-grid"),calendarPrev:$("#calendar-prev"),calendarNext:$("#calendar-next"),
  gradeTrigger:$("#grade-trigger"),gradeMenu:$("#grade-menu"),gradeValue:$("#grade-value"),
  classTrigger:$("#class-trigger"),classMenu:$("#class-menu"),classValue:$("#class-value"),
  refresh:$("#refresh-button")
};

document.addEventListener("DOMContentLoaded",init);

function init(){
  renderCustomOptions();
  bind();
  applyLanguage();
  applyTheme(state.theme,false);
  sync();
  load();
  watchSystemTheme();
}

function bind(){
  el.brandTrigger.onclick=toggleBrandMenu;
  el.prev.onclick=()=>moveDate(-1);
  el.next.onclick=()=>moveDate(1);
  el.heroDate.onclick=toggleDatePopover;
  el.today.onclick=()=>{state.date=today();localStorage.setItem(STORAGE.date,state.date);sync();load();closeDatePopover()};
  el.calendarPrev.onclick=()=>moveCalendarMonth(-1);
  el.calendarNext.onclick=()=>moveCalendarMonth(1);

  el.gradeTrigger.onclick=()=>toggleCustomSelect("grade");
  el.classTrigger.onclick=()=>toggleCustomSelect("class");
  el.refresh.onclick=load;

  el.langs.forEach(button=>button.onclick=()=>{
    state.language=button.dataset.language;
    localStorage.setItem(STORAGE.language,state.language);
    applyLanguage();
    sync();
    load();
    closeBrandMenu();
  });

  el.theme.onclick=()=>{state.theme=state.theme==="dark"?"light":"dark";applyTheme(state.theme,true)};
  el.allergy.onclick=openModal;
  el.close.onclick=closeModal;

  el.modal.onclick=e=>{if(e.target.matches("[data-modal-close]"))closeModal()};

  document.querySelectorAll(".brand-nav a").forEach(link=>link.onclick=()=>closeBrandMenu());

  document.addEventListener("click",e=>{
    if(!el.datePopover.hidden&&!el.datePopover.contains(e.target)&&!el.heroDate.contains(e.target))closeDatePopover();
    if(!el.brandMenu.hidden&&!el.brandMenu.contains(e.target)&&!el.brandTrigger.contains(e.target))closeBrandMenu();
    if(!el.gradeMenu.hidden&&!el.gradeMenu.contains(e.target)&&!el.gradeTrigger.contains(e.target))closeCustomSelect("grade");
    if(!el.classMenu.hidden&&!el.classMenu.contains(e.target)&&!el.classTrigger.contains(e.target))closeCustomSelect("class");
  });

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      if(!el.datePopover.hidden)closeDatePopover();
      if(!el.brandMenu.hidden)closeBrandMenu();
      if(!el.gradeMenu.hidden)closeCustomSelect("grade");
      if(!el.classMenu.hidden)closeCustomSelect("class");
      if(!el.modal.hidden)closeModal();
    }
  });
}

function renderCustomOptions(){
  el.gradeMenu.innerHTML="";
  for(let i=1;i<=3;i++)el.gradeMenu.append(createOption("grade",i));
  el.classMenu.innerHTML="";
  for(let i=1;i<=15;i++)el.classMenu.append(createOption("class",i));
}

function createOption(type,value){
  const button=document.createElement("button");
  button.type="button";
  button.className="custom-option";
  button.dataset.value=value;
  button.role="option";
  button.textContent=formatClassChoice(type,value);
  button.onclick=()=>selectClassChoice(type,value);
  return button;
}

function formatClassChoice(type,value){
  if(state.language==="ko")return type==="grade"?value+"학년":value+"반";
  return (type==="grade"?"Grade ":"Class ")+value;
}

function toggleCustomSelect(type){
  const target=type==="grade"?el.gradeMenu:el.classMenu;
  const other=type==="grade"?el.classMenu:el.gradeMenu;
  const trigger=type==="grade"?el.gradeTrigger:el.classTrigger;
  const open=target.hidden;
  other.hidden=true;
  (type==="grade"?el.classTrigger:el.gradeTrigger).setAttribute("aria-expanded","false");
  target.hidden=!open;
  trigger.setAttribute("aria-expanded",String(open));
  if(open){
    document.querySelectorAll(".custom-option").forEach(node=>{
      const selected=(type==="grade"?state.grade:state.classNumber)===Number(node.dataset.value);
      node.classList.toggle("selected",selected);
      node.setAttribute("aria-selected",String(selected));
    });
  }
}

function closeCustomSelect(type){
  const menu=type==="grade"?el.gradeMenu:el.classMenu;
  const trigger=type==="grade"?el.gradeTrigger:el.classTrigger;
  menu.hidden=true;
  trigger.setAttribute("aria-expanded","false");
}

function selectClassChoice(type,value){
  if(type==="grade"){
    state.grade=value;
    localStorage.setItem(STORAGE.grade,String(value));
    closeCustomSelect("grade");
  }else{
    state.classNumber=value;
    localStorage.setItem(STORAGE.classNumber,String(value));
    closeCustomSelect("class");
  }
  sync();
  load();
}

function toggleBrandMenu(){
  const open=el.brandMenu.hidden;
  el.brandMenu.hidden=!open;
  el.brandTrigger.setAttribute("aria-expanded",String(open));
}

function closeBrandMenu(){
  el.brandMenu.hidden=true;
  el.brandTrigger.setAttribute("aria-expanded","false");
}

function watchSystemTheme(){
  const media=matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener?.("change",e=>{if(!localStorage.getItem(STORAGE.theme))applyTheme(e.matches?"dark":"light",false)});
}

function toggleDatePopover(){
  if(!el.datePopover.hidden){closeDatePopover();return}
  const date=new Date(state.date+"T00:00:00");
  calendarCursor=new Date(date.getFullYear(),date.getMonth(),1);
  renderCalendar();
  el.datePopover.hidden=false;
  el.heroDate.setAttribute("aria-expanded","true");
}

function closeDatePopover(){
  el.datePopover.hidden=true;
  el.heroDate.setAttribute("aria-expanded","false");
}

function moveCalendarMonth(delta){
  calendarCursor.setMonth(calendarCursor.getMonth()+delta);
  renderCalendar();
}

function renderCalendar(){
  el.calendarTitle.textContent=MONTH_FORMAT[state.language].format(calendarCursor);
  el.calendarPrev.setAttribute("aria-label",t("previousMonth"));
  el.calendarNext.setAttribute("aria-label",t("nextMonth"));
  document.querySelectorAll(".calendar-weekdays span").forEach((node,index)=>{node.textContent=WEEKDAYS[state.language][index]});

  const year=calendarCursor.getFullYear();
  const month=calendarCursor.getMonth();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const daysInPrevMonth=new Date(year,month,0).getDate();
  const totalCells=Math.ceil((firstDay+daysInMonth)/7)*7;
  const selected=state.date;
  const todayValue=today();

  el.calendarGrid.innerHTML="";
  for(let index=0;index<totalCells;index++){
    const dayNumber=index-firstDay+1;
    let cellDate;
    let day=dayNumber;
    let otherMonth=false;

    if(dayNumber<1){
      day=daysInPrevMonth+dayNumber;
      cellDate=formatDate(new Date(year,month-1,day));
      otherMonth=true;
    }else if(dayNumber>daysInMonth){
      day=dayNumber-daysInMonth;
      cellDate=formatDate(new Date(year,month+1,day));
      otherMonth=true;
    }else{
      cellDate=formatDate(new Date(year,month,day));
    }

    const button=document.createElement("button");
    button.type="button";
    button.className="calendar-day";
    button.textContent=day;
    button.dataset.date=cellDate;
    button.setAttribute("aria-label",formatLabel(cellDate));
    if(otherMonth)button.classList.add("other-month");
    if(cellDate===todayValue)button.classList.add("today");
    if(cellDate===selected){button.classList.add("selected");button.setAttribute("aria-current","date")}
    button.onclick=()=>selectDate(cellDate);
    el.calendarGrid.append(button);
  }
}

function selectDate(value){
  state.date=value;
  localStorage.setItem(STORAGE.date,state.date);
  sync();
  load();
  closeDatePopover();
}

function moveDate(delta){
  const date=new Date(state.date+"T00:00:00");
  date.setDate(date.getDate()+delta);
  state.date=formatDate(date);
  localStorage.setItem(STORAGE.date,state.date);
  sync();
  load();
}

async function load(){
  setLoading();
  const results=await Promise.allSettled([
    get("/api/meal?date="+apiDate(state.date)),
    get("/api/timetable?date="+apiDate(state.date)+"&grade="+state.grade+"&class="+state.classNumber)
  ]);
  results[0].status==="fulfilled"?renderMeal(results[0].value):renderError(el.meal,t("mealError"));
  results[1].status==="fulfilled"?renderTimetable(results[1].value):renderError(el.tt,t("timetableError"));
}

async function get(url){
  const response=await fetch(url,{headers:{Accept:"application/json"}});
  let data;
  try{data=await response.json()}catch{throw Error("Invalid response")}
  if(!response.ok||data.ok===false)throw Error(data.message||"Request failed");
  return data;
}

function setLoading(){
  const html='<div class="loading-state">'+escapeHtml(t("loading"))+"</div>";
  el.meal.innerHTML=html;
  el.tt.innerHTML=html;
}

function renderMeal(data){
  el.meal.innerHTML="";
  if(!data.meals?.length){showEmpty(el.meal,t("noMeal"));return}
  const item=data.meals.find(x=>x.mealName==="중식")||data.meals[0];
  const summary=document.createElement("div");
  summary.className="meal-summary";
  const name=document.createElement("p"),cal=document.createElement("span");
  name.className="meal-name";
  cal.className="meal-calories";
  name.textContent=item.mealName||"중식";
  cal.textContent=item.calories?t("calories")+" "+item.calories:"";
  summary.append(name,cal);

  const list=document.createElement("ul");
  list.className="menu-list";
  (item.menu||[]).forEach(menu=>{
    const row=document.createElement("li"),nameNode=document.createElement("span"),allergyNode=document.createElement("span");
    row.className="menu-item";
    nameNode.className="menu-name";
    allergyNode.className="allergy-numbers";
    nameNode.textContent=menu.name;
    allergyNode.textContent=menu.allergens.join(".");
    row.append(nameNode,allergyNode);
    list.append(row);
  });
  el.meal.append(summary,list);
}

function renderTimetable(data){
  el.tt.innerHTML="";
  if(!data.periods?.length){showEmpty(el.tt,t("noTimetable"));return}
  const list=document.createElement("ol");
  list.className="timetable-list";
  data.periods.forEach(item=>{
    const row=document.createElement("li"),period=document.createElement("span"),subject=document.createElement("span");
    row.className="period-row";
    period.className="period-number";
    subject.className="subject";
    period.textContent=item.period+t("period");
    subject.textContent=item.subject;
    row.append(period,subject);
    list.append(row);
  });
  el.tt.append(list);
}

function showEmpty(container,message){
  const node=document.createElement("div");
  node.className="empty-state";
  node.textContent=message;
  container.append(node);
}

function renderError(container,message){
  container.innerHTML="";
  const node=document.createElement("div");
  node.className="error-state";
  node.textContent=message;
  container.append(node);
}

function openModal(){
  renderAllergy();
  el.modal.hidden=false;
  document.documentElement.classList.add("modal-open");
  el.close.focus();
}

function closeModal(){
  el.modal.hidden=true;
  document.documentElement.classList.remove("modal-open");
  el.allergy.focus();
}

function renderAllergy(){
  el.allergyList.innerHTML="";
  ALLERGIES[state.language].forEach((name,index)=>{
    const row=document.createElement("div"),number=document.createElement("span"),label=document.createElement("span");
    row.className="allergy-item";
    number.className="allergy-number";
    label.className="allergy-name";
    number.textContent=index+1;
    label.textContent=name;
    row.append(number,label);
    el.allergyList.append(row);
  });
}

function applyLanguage(){
  document.documentElement.lang=state.language;
  document.querySelectorAll("[data-i18n]").forEach(node=>node.textContent=t(node.dataset.i18n));
  el.langs.forEach(button=>{
    const active=button.dataset.language===state.language;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  el.refresh.setAttribute("aria-label",t("refresh"));
  el.refresh.title=t("refresh");
  renderAllergy();
  renderCustomOptions();
  if(calendarCursor&&!el.datePopover.hidden)renderCalendar();
  sync();
  updateThemeButton();
}

function applyTheme(theme,save){
  state.theme=theme;
  document.documentElement.dataset.theme=theme;
  if(save)localStorage.setItem(STORAGE.theme,theme);
  updateThemeButton();
}

function updateThemeButton(){
  const dark=state.theme==="dark";
  el.theme.setAttribute("aria-label",t(dark?"themeToLight":"themeToDark"));
  el.theme.title=t(dark?"themeToLight":"themeToDark");
}

function sync(){
  el.gradeValue.textContent=formatClassChoice("grade",state.grade);
  el.classValue.textContent=formatClassChoice("class",state.classNumber);
  el.heroDate.textContent=formatLabel(state.date);
  el.prev.setAttribute("aria-label",t("previousDay"));
  el.next.setAttribute("aria-label",t("nextDay"));
  el.close.setAttribute("aria-label",t("close"));
}

function t(key){return TEXT[state.language][key]||key}

function getSavedDate(){
  const saved=localStorage.getItem(STORAGE.date);
  return saved&&/^\d{4}-\d{2}-\d{2}$/.test(saved)?saved:today();
}

function today(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const values=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return values.year+"-"+values.month+"-"+values.day;
}

function formatDate(date){
  return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
}

function formatLabel(value){
  return new Intl.DateTimeFormat(state.language==="ko"?"ko-KR":"en-US",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(new Date(value+"T00:00:00"));
}

function apiDate(value){return value.replaceAll("-","")}

function getNumber(key,fallback,max){
  const value=Number(localStorage.getItem(key));
  return Number.isInteger(value)&&value>=1&&value<=max?value:fallback;
}

function escapeHtml(value){
  const div=document.createElement("div");
  div.textContent=value;
  return div.innerHTML;
}