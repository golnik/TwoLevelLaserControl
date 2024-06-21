google.load('visualization', '1', {packages: ['corechart', 'line']});

function general_pulse(t,env,w0,phi){
  return env(t)*Math.sin(w0*t+phi);
}
  
function control_env(t,t0,ai,af,alpha,mu){
  var ex=Math.exp(alpha*(t-t0));
  return (1./mu)*alpha*(af-ai)*ex/
        ((1.+ex)*Math.sqrt((1.-ai+(1.-af)*ex)*(ai+af*ex)));
}

function ffunc(t,t0,ai,af,alpha){
  var g=1./(1.+Math.exp(-alpha*(t-t0)));
  return ai*(1-g)+af*g;
}

var PulsePlot;
var PulsePlotData;

var PulsePlotOptions={
  fontSize: 14,
  title: 'Laser pulse',
  hAxis:{
    title: 'Time [fs]'
  },
  vAxis:{
    title: 'E [V/m]',
    format: '0.0#E+0'
  },
  legend: 'top'
  
  //width: 900,
  //height: 500
};

function calcPulsePlot(tmin,tmax,N,pulse,env){
  au2fs=2.418884326509e-2;
  au2Vpm=5.142206707e+11;
  
  PulsePlotData=new google.visualization.DataTable();
  PulsePlotData.addColumn('number', 'time');
  PulsePlotData.addColumn('number', 'field');
  PulsePlotData.addColumn('number', 'envelope');

  var t=tmin;
  var dt=(tmax-tmin)/N;
  for(var i=0; i<=N; i++){
    PulsePlotData.addRow([t*au2fs, pulse(t)*au2Vpm, Math.abs(env(t)*au2Vpm)]);
    t+=dt;
  }

  var formatter=new google.visualization.NumberFormat({
    pattern: '0.0',
    suffix: ' fs'
  });
  formatter.format(PulsePlotData,0);

  var formatter=new google.visualization.NumberFormat({
    pattern: '0.0#E+0',
    suffix: ' V/m'
  });
  formatter.format(PulsePlotData,1);
  formatter.format(PulsePlotData,2);
}

function drawPulsePlot(tmin,tmax,N,pulse,env){
  calcPulsePlot(tmin,tmax,N,pulse,env);
  PulsePlot=new google.visualization.LineChart(document.getElementById('pulse'));
  PulsePlot.draw(PulsePlotData,PulsePlotOptions);
}

var PopulPlot;
var PopulPlotData;

var PopulPlotOptions={
  fontSize: 14,
  title: ' Evolution of the populations of the states',
  hAxis:{
    title: 'Time [fs]'
  },
  vAxis:{
    title: 'Populations'
  },
  legend: 'top',
  colors: ['#FF0000','#0000CC','#006600']
  //width: 900,
  //height: 500
};

function calcPopulPlot(tmin,tmax,mu,cr,ci,pulse,wa,wb,func){
  var au2fs=2.418884326509e-2;

  var w=wb-wa;
  
  f=function(t,x){
    return [mu*pulse(t)*(x[2]*Math.sin(w*t)-x[3]*Math.cos(w*t)),
            mu*pulse(t)*(x[2]*Math.cos(w*t)+x[3]*Math.sin(w*t)),
            -mu*pulse(t)*(x[0]*Math.sin(w*t)+x[1]*Math.cos(w*t)),
      mu*pulse(t)*(x[0]*Math.cos(w*t)-x[1]*Math.sin(w*t))
            ];
  }

  var rca=Math.sqrt(cr)*Math.cos(-wa*tmin);
  var ica=Math.sqrt(cr)*Math.sin(-wa*tmin);
  var rcb=Math.sqrt(1.-cr)*Math.cos(-wb*tmin);
  var icb=Math.sqrt(1.-cr)*Math.sin(-wb*tmin);

  sol=numeric.dopri(tmin,tmax,[rca,ica,rcb,icb],f,1e-8,2000);
  var c=numeric.transpose(sol.y);

  var time=sol.x;

  PopulPlotData=new google.visualization.DataTable();
  PopulPlotData.addColumn('number','time');
  PopulPlotData.addColumn('number','f(t)');
  PopulPlotData.addColumn('number','|c₁(t)|²');
  PopulPlotData.addColumn('number','|c₂(t)|²');

  for(var i=0; i<time.length; i++){
    var popa=c[0][i]*c[0][i]+c[1][i]*c[1][i];
    var popb=c[2][i]*c[2][i]+c[3][i]*c[3][i];
    PopulPlotData.addRow([time[i]*au2fs,func(time[i]),popa,popb]);
  }

  var formatter=new google.visualization.NumberFormat({
    pattern: '0.0',
    suffix: ' fs'
  });
  formatter.format(PopulPlotData,0);

  var formatter=new google.visualization.NumberFormat({
    pattern: '0.00',
  });
  formatter.format(PopulPlotData,1);
  formatter.format(PopulPlotData,2);
  formatter.format(PopulPlotData,3);
}

function drawPopulPlot(tmin,tmax,mu,cr,ci,pulse,wa,wb,func){
  calcPopulPlot(tmin,tmax,mu,cr,ci,pulse,wa,wb,func)
  PopulPlot=new google.visualization.LineChart(document.getElementById('populations'));
  PopulPlot.draw(PopulPlotData,PopulPlotOptions);
}

function displayResult() {
  var au2fs=2.418884326509e-2;
   var N=1000;
   
   var tmin=parseFloat(tmin_inp.value)/au2fs;
   var tmax=parseFloat(tmax_inp.value)/au2fs;
   if(tmin>=tmax){alert('tmax should be greater than tmin'); return;}
   
   var alpha=parseFloat(alpha_inp.value);
   if(alpha<=0){alert('alpha should be greater than 0'); return;}
   var t0=parseFloat(t0_inp.value)/au2fs;
   if(t0<tmin || t0>tmax){alert('t0 should be in [tmin;tmax] interval'); return;}
   
   var ai=parseFloat(ai_inp.value);
   if(ai<0 || ai>1){alert('ai should be in [0;1] interval'); return;}
   var af=parseFloat(af_inp.value);
   if(af<0 || af>1){alert('af should be in [0;1] interval'); return;}
   var mu=parseFloat(mu_inp.value);
   if(mu<=0){alert('mu should be greater than 0'); return;}
   var wa=parseFloat(wa_inp.value);
   var wb=parseFloat(wb_inp.value);

   var phi=tmin*(wb-wa);
   var w=wb-wa;
   
   env=function(t){return control_env(t,t0,ai,af,alpha,mu);}
   pulse=function(t){return general_pulse(t,env,w,phi);}
   func=function(t){return ffunc(t,t0,ai,af,alpha);}
   
   drawPulsePlot(tmin,tmax,N,pulse,env);
   drawPopulPlot(tmin,tmax,mu,ai,0,pulse,wa,wb,func);
}